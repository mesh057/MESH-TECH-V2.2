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
const GroupSettingsStore = require('../utils/groupSettingsStore');
const MessageCache = require('../utils/messageCache');
const CommandToggle = require('../utils/commandToggle');
const AutoJoiner = require('../utils/autoJoin');
const ActiveTracker = require('../utils/activeTracker');
const { loadCommands } = require('../utils/commandLoader');
const { registerMessageHandler } = require('../events/messages');

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
        this.messageCache = new MessageCache();
        this.commandToggle = new CommandToggle(this.settings);
        this.autoJoiner = new AutoJoiner(this.dataDir);
        this.activeTracker = new ActiveTracker();
        
        this.sock = null;
        this.commands = null;
        this.isOnline = false;
        this.reconnectAttempts = 0;
        this.replacingAuth = false;
        this.connecting = false;
    }

    /** Adopt credentials created by the pairing dashboard without deleting bot data. */
    async adoptPairingSession(sourceDir) {
        if (this.replacingAuth) return;
        this.replacingAuth = true;
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
        if (this.connecting) return;
        this.connecting = true;
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
                browser: ['Ubuntu', 'Chrome', '120.0.6099.130'],
            });

            this.sock.ev.on('creds.update', saveCreds);
            this.registerEvents();
            
            registerMessageHandler(this.sock, this.commands, {
                settings: this.settings,
                groupSettings: this.groupSettings,
                messageCache: this.messageCache,
                commandToggle: this.commandToggle,
                activeTracker: this.activeTracker,
                logger: logger.child({ user: this.number })
            });

        } catch (err) {
            logger.error(`[BotInstance:${this.number}] Connection failed: ${err.message}`);
        } finally {
            this.connecting = false;
        }
    }

    registerEvents() {
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'connecting') {
                logger.info(`[BotInstance:${this.number}] Connecting...`);
            }

            if (connection === 'open') {
                this.isOnline = true;
                this.reconnectAttempts = 0;
                logger.info(`[BotInstance:${this.number}] ✅ Connected!`);
                
                await this.autoJoiner.autoJoinGroupOnce(this.sock);
                
                const selfJid = this.sock.user?.id ? jidNormalizedUser(this.sock.user.id) : null;
                if (selfJid) {
                    const prefix = this.settings.get('prefix', '.');
                    const welcomeMsg = `*MESH-TECH MD BOT* is now successfully connected! 🚀\n\n` +
                        `*Status:* Online & Active ✅\n` +
                        `*User:* @${this.number}\n` +
                        `*Prefix:* [ ${prefix} ]\n\n` +
                        `Type *${prefix}menu* to explore all commands.\n\n` +
                        `Thank you for using *MESH-TECH MD BOT*! 🤖`;
                    await this.sock.sendMessage(selfJid, { text: welcomeMsg })
                        .catch((error) => logger.error(`[BotInstance:${this.number}] Welcome message failed: ${error.message}`));
                }
            }

            if (connection === 'close') {
                this.isOnline = false;
                if (this.replacingAuth) return;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                logger.warn(`[BotInstance:${this.number}] Connection closed (reason: ${statusCode})`);

                if (statusCode === DisconnectReason.loggedOut) {
                    logger.error(`[BotInstance:${this.number}] Logged out. Cleaning up...`);
                    this.destroy();
                } else {
                    this.reconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                    setTimeout(() => this.connect(), delay);
                }
            }
        });
    }

    destroy() {
        try {
            if (this.sock) this.sock.end();
            fs.rmSync(this.authDir, { recursive: true, force: true });
        } catch (err) {
            logger.error(`[BotInstance:${this.number}] Destroy failed: ${err.message}`);
        }
    }
}

module.exports = BotInstance;
