'use strict';

class ActiveTracker {
    constructor() {
        this.records = new Map();
        this.interval = setInterval(() => this.clearOld(), 10 * 60 * 1000);
    }

    recordActivity(jid) {
        if (!jid || jid === 'status@broadcast') return;
        const entry = this.records.get(jid) || { count: 0, lastSeen: 0 };
        entry.count += 1;
        entry.lastSeen = Date.now();
        this.records.set(jid, entry);
    }

    getActiveUsers(windowSec = 60) {
        const cutoff = Date.now() - windowSec * 1000;
        const list = [];
        for (const [jid, entry] of this.records.entries()) {
            if (entry.lastSeen >= cutoff) list.push({ jid, count: entry.count });
        }
        return list.sort((a, b) => b.count - a.count).slice(0, 20);
    }

    clearOld(maxAgeSec = 3600) {
        const cutoff = Date.now() - maxAgeSec * 1000;
        for (const [jid, entry] of this.records.entries()) {
            if (entry.lastSeen < cutoff) this.records.delete(jid);
        }
    }

    destroy() {
        clearInterval(this.interval);
    }
}

module.exports = ActiveTracker;
