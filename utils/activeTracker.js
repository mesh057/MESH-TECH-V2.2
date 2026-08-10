/**
 * activeTracker.js — tracks unique users who have triggered commands (real-time counter).
 */
'use strict';
const records = new Map(); // jid -> { count, lastSeen }

function recordActivity(jid) {
  if (!jid || jid === 'status@broadcast') return;
  const entry = records.get(jid) || { count: 0, lastSeen: 0 };
  entry.count += 1;
  entry.lastSeen = Date.now();
  records.set(jid, entry);
}

function getActiveUsers(windowSec = 60) {
  const cutoff = Date.now() - windowSec * 1000;
  const list = [];
  for (const [jid, entry] of records.entries()) {
    if (entry.lastSeen >= cutoff) list.push({ jid, count: entry.count });
  }
  return list.sort((a, b) => b.count - a.count).slice(0, 20);
}

function clearOld(maxAgeSec = 3600) {
  const cutoff = Date.now() - maxAgeSec * 1000;
  for (const [jid, entry] of records.entries()) {
    if (entry.lastSeen < cutoff) records.delete(jid);
  }
}

// Clean up stale entries every 10 minutes
setInterval(() => clearOld(), 10 * 60 * 1000);

module.exports = { recordActivity, getActiveUsers };
