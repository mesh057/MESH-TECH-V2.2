'use strict';

const fs = require('fs');
const path = require('path');
const { isOwner } = require('./isOwner');
const { isSenderAdmin, isBotAdmin } = require('./isAdmin');

async function getGroupFlags(sock, msg) {
  const from = msg?.key?.remoteJid || '';
  if (!from.endsWith('@g.us')) return { senderAdmin: false, botAdmin: false };
  try {
    const metadata = await sock.groupMetadata(from);
    const sender = msg.key.participantPn || msg.key.participantAlt || msg.key.participant || msg.key.remoteJid;
    return {
      senderAdmin: isSenderAdmin(metadata, sender),
      botAdmin: isBotAdmin(sock, metadata),
    };
  } catch {
    return { senderAdmin: false, botAdmin: false };
  }
}

const legacyDataPath = path.join(__dirname, '..', 'data', 'legacyBotData.json');
function loadLegacyData() {
  try {
    if (fs.existsSync(legacyDataPath)) return JSON.parse(fs.readFileSync(legacyDataPath, 'utf8'));
  } catch {}
  return { antiDelete: {}, statusSettings: {} };
}
function saveLegacyData(data) {
  fs.mkdirSync(path.dirname(legacyDataPath), { recursive: true });
  fs.writeFileSync(legacyDataPath, JSON.stringify(data, null, 2));
}

function makeSession(sock, msg) {
  const sender = msg?.key?.remoteJid || '';
  return {
    sender,
    safeSendMessage: (jid, content, options) => sock.sendMessage(jid, content, options),
    sendMessage: (jid, content, options) => sock.sendMessage(jid, content, options),
    sock,
    userId: sock.user?.id,
  };
}

async function executeLegacy(handler, sock, msg, args) {
  const from = msg?.key?.remoteJid || '';
  const flags = await getGroupFlags(sock, msg);
  const owner = isOwner(msg);
  const botData = loadLegacyData();
  const saveBotData = async () => saveLegacyData(botData);
  const userId = sock.user?.id || '';
  const session = makeSession(sock, msg);
  const name = handler.__legacyName || '';

  if (handler.__legacyRun) {
    return handler.__legacyHandler(session, msg, args, {
      sender: from,
      contextInfo: msg?.message?.extendedTextMessage?.contextInfo || {},
    });
  }

  switch (name) {
    case 'anticall':
    case 'autoreacts':
    case 'status':
      return handler(sock, from, msg, owner, botData, saveBotData, userId, args);
    case 'antilink':
      return handler(sock, from, msg, flags.senderAdmin || owner, flags.botAdmin, botData, saveBotData, args);
    case 'kick':
      return handler(sock, from, msg, flags.senderAdmin || owner, flags.botAdmin, botData, saveBotData, args);
    case 'welcome':
      return handler(sock, from, msg, flags.senderAdmin || owner, botData, saveBotData, args);
    case 'dp':
      return handler(sock, from, msg, args);
    case 'vv':
      return handler(sock, from, msg);
    case 'antidelete':
      return handler(sock, from, msg, owner, botData, saveBotData, userId, args);
    case 'pinterest':
    case 'remini':
    case 'song':
    case 'video':
      return handler(session, from, msg, args);
    default:
      return handler(sock, msg, args);
  }
}

function wrapLegacy(name, loaded) {
  if (typeof loaded === 'function') {
    loaded.__legacyName = name;
    return { name, execute: (sock, msg, args) => executeLegacy(loaded, sock, msg, args) };
  }
  if (loaded && typeof loaded.run === 'function' && Array.isArray(loaded.commands)) {
    return loaded.commands.map((commandName) => {
      const handler = loaded.run;
      const wrappedHandler = handler;
      wrappedHandler.__legacyName = commandName;
      wrappedHandler.__legacyRun = true;
      wrappedHandler.__legacyHandler = handler;
      return { name: commandName, execute: (sock, msg, args) => executeLegacy(wrappedHandler, sock, msg, args) };
    });
  }
  return null;
}

module.exports = { wrapLegacy };
