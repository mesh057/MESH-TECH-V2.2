const config = require('../config/config');
const { getContext } = require('./context');

function normalizeNumber(value) {
  return String(value || '').replace(/\D/g, '');
}

function isOwner(msg, resources = {}) {
  if (msg?.key?.fromMe) return true;

  const context = getContext() || {};
  const configuredOwner = resources.ownerNumber || context.ownerNumber || context.instanceNumber || config.ownerNumber;
  const ownerNumber = normalizeNumber(configuredOwner);
  const senderJid = msg?.key?.participantPn || msg?.key?.participantAlt || msg?.key?.participant || msg?.key?.remoteJidAlt || msg?.key?.remoteJid || '';
  const senderNumber = normalizeNumber(String(senderJid).split('@')[0].split(':')[0]);

  return Boolean(ownerNumber && senderNumber === ownerNumber);
}

module.exports = { isOwner };

/*
 * Every command executed by events/messages.js runs inside the active
 * BotInstance AsyncLocalStorage context. This keeps owner checks isolated
 * when several WhatsApp accounts share one Node.js process.
 */
