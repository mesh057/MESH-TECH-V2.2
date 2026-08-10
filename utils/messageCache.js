'use strict';

class MessageCache {
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    set(jid, id, data) {
        const key = \`\${jid}:\${id}\`;
        this.cache.set(key, { ...data, timestamp: Date.now() });
        
        if (this.cache.size > this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    get(jid, id) {
        return this.cache.get(\`\${jid}:\${id}\`);
    }

    clear() {
        const size = this.cache.size;
        this.cache.clear();
        return size;
    }
}

module.exports = MessageCache;
