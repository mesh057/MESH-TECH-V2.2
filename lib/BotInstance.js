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
const AutoJoiner = require('./autoJoin');
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
    }

    async init() {
        await this.settings.ready;
        await this.groupSettings.ready;
        this.commands = loadCommands(path.join(__dirname, '../commands'));
        await this.connect();
    }

    async connect() {
        try {
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
                    const welcomeMsg = `*MESH-TECH MD BOT* is now successfully connected! 🚀\n\n*Status:* Online & Active ✅\n*User:* @${this.number}\n*Prefix:* [ ${prefix} ]`;
                    await this.sock.sendMessage(selfJid, { text: welcomeMsg });
                }
            }

            if (connection === 'close') {
                this.isOnline = false;
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
