'use strict';

const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    DisconnectReason,
    jidNormalizedUser
} = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const SettingsStore = require('../utils/settingsStore');
const PresenceManager = require('../utils/presenceManager');
const GroupSettingsStore = require('../utils/groupSettingsStore');
const MessageCache = require('../utils/messageCache');
const CommandToggle = require('../utils/commandToggle');
const AutoJoiner = require('../utils/autoJoin');
const ActiveTracker = require('../utils/activeTracker');
const instanceManager = require('../utils/instanceManager');
const { loadCommands } = require('../utils/commandLoader');
const { registerMessageHandler } = require('../events/messages');
const config = require('../config/config');

function isFatalSignalSessionError(error) {
    const statusCode = error?.output?.statusCode ?? error?.statusCode;
    const message = String(error?.message || error || '').toLowerCase();
    return statusCode === DisconnectReason.badSession || statusCode === 500 ||
        message.includes('bad mac') || message.includes('no matching sessions') ||
        message.includes('sessionerror');
}

class BotInstance {
    constructor(number, authDir) {
        this.number = number;
        this.authDir = authDir;
        this.dataDir = path.join(authDir, 'data');
        
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }

        this.settings = new SettingsStore(this.dataDir, number);
        this.groupSettings = new GroupSettingsStore(this.dataDir, number);
        this.presenceManager = new PresenceManager(this.settings, logger.child({ user: number, module: 'presence' }));
        this.messageCache = new MessageCache();
        this.commandToggle = new CommandToggle(this.settings);
        this.autoJoiner = new AutoJoiner(this.dataDir, config.officialGroupInvite);
        this.activeTracker = new ActiveTracker();
        // Per-instance, per-chat submenu state; never shared across tenants.
        this.menuState = new Map();
        
        this.sock = null;
        this.commands = null;
        this.isOnline = false;
        this.reconnectAttempts = 0;
        this.replacingAuth = false;
        this.connecting = false;
        this.sessionResetRequired = false;
        this.watchdogTimer = null;
    }

    /** Adopt credentials created by the pairing dashboard without deleting bot data. */
    async adoptPairingSession(sourceDir) {
        if (this.replacingAuth) return;
        this.replacingAuth = true;
        // Fresh pairing is the explicit recovery boundary for this tenant.
        // Clear stale guards before touching the old socket so delayed close
        // events cannot prevent the new credentials from connecting.
        this.sessionResetRequired = false;
        this.connecting = false;
        try {
            if (this.sock) {
                try { this.sock.end(undefined); } catch (_) {}
                this.sock = null;
            }
            await new Promise((resolve) => setTimeout(resolve, 750));
            fs.mkdirSync(this.authDir, { recursive: true });
            for (const entry of fs.readdirSync(this.authDir)) {
                if (entry === 'data' || entry === '.instance.lock') continue;
                fs.rmSync(path.join(this.authDir, entry), { recursive: true, force: true });
            }
            for (const entry of fs.readdirSync(sourceDir)) {
                fs.cpSync(path.join(sourceDir, entry), path.join(this.authDir, entry), { recursive: true });
            }
            this.reconnectAttempts = 0;
            this.isOnline = false;
            // Re-assert the recovery boundary immediately before connecting;
            // the old socket may have emitted a delayed fatal close event.
            this.sessionResetRequired = false;
            this.connecting = false;
            await this.connect();
            logger.info(`[BotInstance:${this.number}] Adopted newly paired credentials and restarted.`);
        } finally {
            this.replacingAuth = false;
        }
    }

    async init() {
        await this.settings.ready;
        await this.groupSettings.ready;
        this.commands = loadCommands(path.join(__dirname, '../commands'));
        await this.connect();
    }

    async connect() {
        if (this.sessionResetRequired || this.connecting) return;
        this.connecting = true;
        
        // Watchdog: If we stay in "connecting" for too long, force a reset
        if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
        this.watchdogTimer = setTimeout(() => {
            if (!this.isOnline) {
                logger.warn(`[BotInstance:${this.number}] Connection watchdog triggered. Forcing reconnect...`);
                if (this.sock) {
                    try { this.sock.end(undefined); } catch (_) {}
                    this.sock = null;
                }
                this.connecting = false;
                this.reconnectAttempts++;
                this.connect();
            }
        }, 60000); // 1 minute is enough for a handshake

        try {
            await this.settings.ready;
            await this.groupSettings.ready;
            if (!this.commands || this.commands.size === 0) {
                this.commands = loadCommands(path.join(__dirname, '../commands'));
                logger.info(`[BotInstance:${this.number}] Loaded ${this.commands.size} commands and aliases.`);
            }
            const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
            const { version } = await fetchLatestBaileysVersion();

            this.sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger.child({ module: `baileys-${this.number}` })),
                },
                printQRInTerminal: false,
                logger: logger.child({ module: `baileys-${this.number}` }),
                browser: ['Ubuntu', 'Chrome', '130.0.0.0'],
                syncFullHistory: false,
                markOnlineOnConnect: false,
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 0,
                keepAliveIntervalMs: 10000,
                generateHighQualityLinkPreview: true,
            });

            this.sock.ev.on('creds.update', saveCreds);
            this.presenceManager.attach(this.sock);
            this.registerEvents();
            
            registerMessageHandler(this.sock, this.commands, {
                settings: this.settings,
                groupSettings: this.groupSettings,
                messageCache: this.messageCache,
                commandToggle: this.commandToggle,
                activeTracker: this.activeTracker,
                presenceManager: this.presenceManager,
                authDir: this.authDir,
                // Command handlers receive this resources object as their fourth
                // argument. Keep the instance's catalog available to menu/help.
                commands: this.commands,
                menuState: this.menuState,
                onSessionError: (error) => this.handleSessionError(error),
                logger: logger.child({ user: this.number })
            });

        } catch (err) {
            logger.error(`[BotInstance:${this.number}] Connection failed: ${err.message}`);
            this.connecting = false;
        }
        // Note: this.connecting is reset in the connection.update event (open/close)
        // so it stays true while the background socket is actually connecting.
    }

    registerEvents() {
        this.sock.ev.on('group-participants.update', async (anu) => {
            try {
                if (anu.action !== 'add') return;
                const id = anu.id;
                const groupWelcomeKey = `welcome_${id}`;
                const welcomeData = this.settings.get(groupWelcomeKey, null);
                if (!welcomeData || !welcomeData.status) return;

                const groupMetadata = await this.sock.groupMetadata(id).catch(() => null);
                if (!groupMetadata) return;

                const groupName = groupMetadata.subject;
                const groupDesc = groupMetadata.desc || 'No description available';
                const customMessage = welcomeData.message;

                for (const participant of anu.participants) {
                    const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
                    const user = participantString.split('@')[0];

                    let finalMessage;
                    if (customMessage) {
                        finalMessage = customMessage
                            .replace(/{user}/g, `@${user}`)
                            .replace(/{group}/g, groupName)
                            .replace(/{description}/g, groupDesc);
                    } else {
                        finalMessage = `👋 *Welcome @${user}!*\n\n` +
                                       `Thank you for joining *${groupName}*! 🤖\n\n` +
                                       `👥 *Join our community group:*\n` +
                                       `${config.officialGroupInvite}\n\n` +
                                       `*Group Description:*\n${groupDesc}`;
                    }

                    await this.sock.sendMessage(id, {
                        text: finalMessage,
                        mentions: [participantString]
                    }).catch(() => {});
                }
            } catch (e) {
                logger.error(`[BotInstance:${this.number}] Welcome event error: ${e.message}`);
            }
        });

        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'connecting') {
                logger.info(`[BotInstance:${this.number}] Connecting...`);
            }

            if (connection === 'open') {
                this.isOnline = true;
                this.connecting = false;
                this.reconnectAttempts = 0;
                if (this.watchdogTimer) {
                    clearTimeout(this.watchdogTimer);
                    this.watchdogTimer = null;
                }
                logger.info(`[BotInstance:${this.number}] ✅ Connected!`);
                
                await this.autoJoiner.autoJoinGroupOnce(this.sock);
                
                const selfJid = this.sock.user?.id ? jidNormalizedUser(this.sock.user.id) : null;
                if (selfJid) {
                    const prefix = this.settings.get('prefix', '.');
                    const communityUrl = config.officialGroupInvite;
                    const channelUrl = 'https://whatsapp.com/channel/0029VbDeTrNEKyZ9GlUude2R';
                    const welcomeMsg = `*MESH-TECH MD BOT* is now successfully connected! 🚀\n\n` +
                        `*Status:* Online & Active ✅\n` +
                        `*Owner:* @${this.number}\n` +
                        `*Prefix:* [ ${prefix} ]\n\n` +
                        `> Type *${prefix}menu* to explore all commands.\n\n` +
                        `*Powered by MESH TECH* ⚡\n\n` +
                        `👋 Welcome to *MESH-TECH MD BOT*! 🤖\n\n` +
                        `Thank you for using *MESH-TECH MD BOT*!\n\n` +
                        `👥 *Join our community group:*\n${communityUrl}\n\n` +
                        `📢 *Follow our channel:*\n${channelUrl}\n\n` +
                        `Type *${prefix}menu* to explore all commands!`;
                    await this.sock.sendMessage(selfJid, { text: welcomeMsg })
                        .catch((error) => logger.error(`[BotInstance:${this.number}] Welcome message failed: ${error.message}`));

                    // ✅ BWM XMD Style Progressive Countdown & Status Edited Session Delivery
                    setTimeout(async () => {
                        try {
                            const credsPath = path.join(this.authDir, "creds.json");
                            if (fs.existsSync(credsPath)) {
                                // Send initial countdown message
                                const initialMsg = await this.sock.sendMessage(selfJid, { text: '🔄 *Generating Session ID...*\n⏳ Step 1/10: Initializing secure storage...' }).catch(() => null);
                                const key = initialMsg?.key;

                                for (let i = 2; i <= 10; i++) {
                                    await new Promise(r => setTimeout(r, 800)); // Slightly slower for better stability
                                    const percentage = i * 10;
                                    let stepText = `🔄 *Generating Session ID...*\n⏳ Step ${i}/10: Syncing credentials (${percentage}%)...`;
                                    if (i === 10) stepText = `✅ *Session Generated Successfully!*`;
                                    
                                    if (key) {
                                        await this.sock.sendMessage(selfJid, { text: stepText, edit: key }).catch(() => {
                                            // Fallback if edit fails
                                            return this.sock.sendMessage(selfJid, { text: stepText }).catch(() => null);
                                        });
                                    }
                                }

                                // Final stabilization wait
                                await new Promise(r => setTimeout(r, 1000));

                                const creds = fs.readFileSync(credsPath, "utf-8");
                                const base64 = Buffer.from(creds).toString("base64");
                                const sessionId = `MESH-TECH;;;${base64}`;
                                const notice = `╭━━━〔 *MESH-TECH CLOUD SESSION* 〕━━━┈⊷\n` +
                                               `┃ ✅ *Connection Stabilized!*\n` +
                                               `┃ \n` +
                                               `┃ 🔑 *Your SESSION_ID:* \n` +
                                               `╰━━━━━━━━━━━━━━━━━━━━━━┈⊷`;
                                await this.sock.sendMessage(selfJid, { text: notice }).catch(() => null);
                                await this.sock.sendMessage(selfJid, { text: sessionId }).catch(() => null);
                            }
                        } catch (e) {
                            logger.error(`[BotInstance:${this.number}] Progressive session delivery failed: ${e.message}`);
                        }
                    }, 3000); // Start earlier but move slower
                }
            }

            if (connection === 'close') {
                this.isOnline = false;
                this.connecting = false;
                if (this.watchdogTimer) {
                    clearTimeout(this.watchdogTimer);
                    this.watchdogTimer = null;
                }
                this.presenceManager.detach();
                                if (this.replacingAuth) return;
                const disconnectError = lastDisconnect?.error;
                const statusCode = disconnectError?.output?.statusCode;
                logger.warn(`[BotInstance:${this.number}] Connection closed (reason: ${statusCode})`);
                if (isFatalSignalSessionError(disconnectError)) {
                    this.handleSessionError(disconnectError);
                    return;
                }
                if (statusCode === DisconnectReason.loggedOut) {
                    logger.error(`[BotInstance:${this.number}] Logged out. Cleaning up...`);
                    this.destroy();
                    instanceManager.remove(this.number);
                } else {
                    this.reconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                    setTimeout(() => this.connect(), delay);
                }
            }
        });
    }

    handleSessionError(error) {
        if (this.sessionResetRequired) return;
        this.isOnline = false;
        this.presenceManager.detach();
        
        const message = error?.message || 'Unknown Error';
        logger.error(`[BotInstance:${this.number}] Signal session error detected: ${message}`);

        // Only mark as fatal if we've tried a few times without success
        if (this.reconnectAttempts > 5) {
            this.sessionResetRequired = true;
            logger.error(`[BotInstance:${this.number}] Critical session corruption. Manual restart or fresh pairing required.`);
        }

        try { this.sock?.end(error); } catch (_) {}
    }

    destroy() {
        try {
            this.presenceManager.detach();
            if (this.sock) {
                this.sock.ev.removeAllListeners();
                this.sock.end();
            }
            // Only clear non-data auth files if explicitly requested, otherwise 
            // a process restart would wipe all user logins.
        } catch (err) {
            logger.error(`[BotInstance:${this.number}] Destroy failed: ${err.message}`);
        }
    }
}

module.exports = BotInstance;
