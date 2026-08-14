const fs = require('fs');
const path = require('path');
const { getContext } = require('./context');

class SettingsStore {
    constructor(dataDir, ownerJid = 'default') {
        this.dataDir = dataDir;
        this.ownerJid = ownerJid;
        this.dataPath = path.join(dataDir, 'settings.json');
        this.useDb = !!process.env.DATABASE_URL;
        this.state = {};
        this.ready = this.init();
    }

    async init() {
        if (this.useDb) {
            try {
                const db = require('./db');
                await db.query(`
                    CREATE TABLE IF NOT EXISTS bot_settings (
                        owner_jid TEXT NOT NULL,
                        key       TEXT NOT NULL,
                        value     JSONB NOT NULL,
                        PRIMARY KEY (owner_jid, key)
                    );
                `);
                const { rows } = await db.query(
                    'SELECT key, value FROM bot_settings WHERE owner_jid = $1',
                    [this.ownerJid]
                );
                for (const row of rows) this.state[row.key] = row.value;
            } catch (err) {
                this.state = this.loadFromDisk();
            }
        } else {
            this.state = this.loadFromDisk();
        }
    }

    loadFromDisk() {
        try {
            if (!fs.existsSync(this.dataPath)) return {};
            return JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
        } catch {
            return {};
        }
    }

    saveToDisk() {
        try {
            fs.mkdirSync(path.dirname(this.dataPath), { recursive: true });
            fs.writeFileSync(this.dataPath, JSON.stringify(this.state, null, 2));
        } catch (err) {}
    }

    get(key, fallback = undefined) {
        if (key in this.state) return this.state[key];
        
        // Bridge environment variables for Railway/Heroku users
        const envMap = {
            'autoview': 'AUTO_STATUS_SEEN',
            'autoreactstatus': 'AUTO_STATUS_REACT',
            'autolike': 'AUTO_STATUS_REACT',
            'autoreplystatus': 'AUTO_STATUS_REPLY',
            'statusreplytext': 'AUTO_STATUS_MSG',
            'antidelete': 'ANTI_DELETE',
            'wapresence': 'ALWAYS_ONLINE',
            'fakepresence': 'AUTO_TYPING', // Note: AUTO_TYPING/AUTO_RECORDING logic is handled in PresenceManager
            'autotyping': 'AUTO_TYPING',
            'autorecording': 'AUTO_RECORDING',
            'antilink': 'ANTI_LINK',
            'anticall': 'ANTI_CALL',
            'welcome': 'WELCOME'
        };

        const envKey = envMap[key];
        if (envKey && process.env[envKey] !== undefined) {
            const val = process.env[envKey];
            if (val === 'true') return true;
            if (val === 'false') return false;
            return val;
        }

        return fallback;
    }

    set(key, value) {
        this.state[key] = value;
        if (this.useDb) {
            const db = require('./db');
            db.query(
                `INSERT INTO bot_settings (owner_jid, key, value)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (owner_jid, key) DO UPDATE SET value = EXCLUDED.value`,
                [this.ownerJid, key, JSON.stringify(value)]
            ).catch(() => {});
        } else {
            this.saveToDisk();
        }
    }
}

// Proxy object to maintain backward compatibility with require()
const proxy = {
    get: (key, fallback) => {
        const ctx = getContext();
        if (ctx && ctx.settings) return ctx.settings.get(key, fallback);
        return global.mainSettings ? global.mainSettings.get(key, fallback) : fallback;
    },
    set: (key, value) => {
        const ctx = getContext();
        if (ctx && ctx.settings) return ctx.settings.set(key, value);
        if (global.mainSettings) return global.mainSettings.set(key, value);
    },
    ready: Promise.resolve() // Simplification
};

module.exports = SettingsStore;
Object.assign(module.exports, proxy);
