const fs = require('fs');
const path = require('path');
const { getContext } = require('./context');

class GroupSettingsStore {
    constructor(dataDir, ownerJid = 'default') {
        this.dataDir = dataDir;
        this.ownerJid = ownerJid;
        this.dataPath = path.join(dataDir, 'groupSettings.json');
        this.useDb = !!process.env.DATABASE_URL;
        this.state = {};
        this.ready = this.init();
    }

    async init() {
        if (this.useDb) {
            try {
                const db = require('./db');
                await db.query(`
                    CREATE TABLE IF NOT EXISTS group_settings (
                        owner_jid TEXT NOT NULL,
                        jid       TEXT NOT NULL,
                        key       TEXT NOT NULL,
                        value     JSONB NOT NULL,
                        PRIMARY KEY (owner_jid, jid, key)
                    );
                `);
                const { rows } = await db.query(
                    'SELECT jid, key, value FROM group_settings WHERE owner_jid = $1',
                    [this.ownerJid]
                );
                for (const row of rows) {
                    if (!this.state[row.jid]) this.state[row.jid] = {};
                    this.state[row.jid][row.key] = row.value;
                }
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

    get(jid, key, fallback = undefined) {
        return this.state[jid] && key in this.state[jid] ? this.state[jid][key] : fallback;
    }

    set(jid, key, value) {
        if (!this.state[jid]) this.state[jid] = {};
        this.state[jid][key] = value;

        if (this.useDb) {
            const db = require('./db');
            db.query(
                `INSERT INTO group_settings (owner_jid, jid, key, value)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (owner_jid, jid, key) DO UPDATE SET value = EXCLUDED.value`,
                [this.ownerJid, jid, key, JSON.stringify(value)]
            ).catch(() => {});
        } else {
            this.saveToDisk();
        }
    }
}

const proxy = {
    get: (jid, key, fallback) => {
        const ctx = getContext();
        if (ctx && ctx.groupSettings) return ctx.groupSettings.get(jid, key, fallback);
        return global.mainGroupSettings ? global.mainGroupSettings.get(jid, key, fallback) : fallback;
    },
    set: (jid, key, value) => {
        const ctx = getContext();
        if (ctx && ctx.groupSettings) return ctx.groupSettings.set(jid, key, value);
        if (global.mainGroupSettings) return global.mainGroupSettings.set(jid, key, value);
    },
    ready: Promise.resolve()
};

module.exports = GroupSettingsStore;
Object.assign(module.exports, proxy);
