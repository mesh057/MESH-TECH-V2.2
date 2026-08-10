'use strict';

const messageCache = require('../utils/messageCache');
const groupCache = require('../utils/groupCache');
const logger = require('../utils/logger');

// Periodic cache maintenance. Called by index.js on a 6-hour interval
// and on-demand by commands that want to purge runtime caches.
function runClearCache(commands) {
  const results = {};

  // In-memory message dedupe cache
  try {
    results.messagesCleared = messageCache.clear();
  } catch (error) {
    logger.error(`[clearcache] Failed to clear message cache: ${error.message}`);
    results.messagesCleared = null;
  }

  // Baileys group metadata cache (node-cache, self-expiring TTL)
  try {
    groupCache.groupCache.flushAll();
    results.groupsFlushed = true;
  } catch (error) {
    logger.error(`[clearcache] Failed to flush group cache: ${error.message}`);
    results.groupsFlushed = null;
  }

  results.loadedCommands = commands ? commands.size : 0;
  logger.info(`[clearcache] Cache clear completed: ${JSON.stringify(results)}`);
  return results;
}

module.exports = {
  name: 'clearcache',
  aliases: ['cc'],
  category: 'SYSTEM',
  execute: async (sock, msg, args, commands) => {
    const result = runClearCache(commands);
    await sock.sendMessage(msg.key.remoteJid, {
      text: `✅ Cache cleared.\nMessages: ${result.messagesCleared ?? 'done'}\nGroups: ${result.groupsFlushed ? 'flushed' : 'unchanged'}\nLoaded commands: ${result.loadedCommands}`,
    }, { quoted: msg });
  },
  runClearCache,
};
