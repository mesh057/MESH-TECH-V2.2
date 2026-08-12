'use strict';

const { proto, downloadMediaMessage, normalizeMessageContent, isJidStatusBroadcast } = require('@whiskeysockets/baileys');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');
const { runWithContext } = require('../utils/context');
const menuModule = require('../media/menu.js');
const configOwner = config;
const STATUS_REJECTION_COOLDOWN_MS = 15 * 60 * 1000;

function extractMessageText(message) {
  if (!message) return '';
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    ''
  );
}

function isStatusChat(jid) {
  const value = String(jid || '');
  return value === 'status@broadcast' || isJidStatusBroadcast(value) || value.endsWith('@broadcast');
}

function ownerJid() {
  const number = String(configOwner.ownerNumber || '').replace(/[^0-9]/g, '');
  return number ? `${number}@s.whatsapp.net` : null;
}

async function recoverDeletedMessage(sock, key, resources) {
  const { settings, messageCache, logger } = resources;
  if (!settings.get('antidelete', false) || !key?.remoteJid || !key?.id) return;

  const destination = settings.get('antideleteDest', 'p') === 'g'
    ? key.remoteJid
    : ownerJid();
  if (!destination) {
    logger.warn?.('[MessageHandler] Antidelete enabled but no owner number is configured');
    return;
  }

  const cached = messageCache.get(key.remoteJid, key.id);
  if (!cached) {
    await sock.sendMessage(destination, {
      text: `🗑️ *Deleted message detected*\\n\\nMessage ID: ${key.id}\\nThe original content was not cached before deletion.`,
    }).catch((error) => logger.warn?.(`[MessageHandler] Antidelete notice failed: ${error.message}`));
    return;
  }

  const header = `🗑️ *Deleted message recovered*\\nFrom: ${cached.senderJid || key.participant || key.remoteJid}\\n\\n`;
  try {
    if (cached.type === 'text') {
      await sock.sendMessage(destination, { text: `${header}${cached.text || '[empty text]'}` });
    } else if (typeof sock.copyNForward === 'function' && cached.originalMessage) {
      await sock.sendMessage(destination, { text: header.trim() });
      await sock.copyNForward(destination, cached.originalMessage, true);
    } else if (cached.rawMessage) {
      await sock.sendMessage(destination, cached.rawMessage);
    } else {
      await sock.sendMessage(destination, { text: `${header}[${cached.type || 'media'} content recovered]\\n${cached.text || ''}` });
    }
    logger.info?.(`[MessageHandler] Antidelete recovered ${key.id} to ${destination}`);
  } catch (error) {
    logger.warn?.(`[MessageHandler] Antidelete recovery failed for ${key.id}: ${error.message}`);
  }
}

function registerMessageHandler(sock, commands, resources) {
  const { settings, groupSettings, messageCache, commandToggle, logger } = resources;
  // Per-handler state keeps one tenant's privacy rejection from suppressing
  // diagnostics for another tenant. It also resets naturally on reconnect.
  resources.statusReactionRejections ||= new Map();
  
  // Per-instance cutoff to avoid processing old messages
  const CUTOFF_TIME = Math.floor(Date.now() / 1000);

  sock.ev.on('messages.update', async (updates) => {
    for (const entry of updates || []) {
      const protocol = entry?.update?.message?.protocolMessage;
      const revokeType = proto.Message?.ProtocolMessage?.Type?.REVOKE;
      if (!protocol || (revokeType !== undefined && protocol.type !== revokeType)) continue;
      await recoverDeletedMessage(sock, protocol.key || entry.key, resources);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;

    for (const msg of messages) {
      try {
        if (!msg.message) continue;

        const protocol = msg.message.protocolMessage;
        const revokeType = proto.Message?.ProtocolMessage?.Type?.REVOKE;
        if (protocol && (revokeType === undefined || protocol.type === revokeType)) {
          await recoverDeletedMessage(sock, protocol.key || msg.key, resources);
          continue;
        }

        const msgTimestamp = Number(msg.messageTimestamp);
        // Status updates can be delivered after login with the timestamp of the
        // original post. Do not apply the normal stale-message cutoff to them;
        // otherwise autoreactstatus silently misses statuses posted before the
        // bot connected. Ordinary chats still use the cutoff to avoid replaying
        // old messages after a reconnect.
        const isStatusEvent = isStatusChat(msg.key?.remoteJid);
        if (isStatusEvent) {
          logger.info?.(`[MessageHandler] Status upsert received: type=${type} id=${msg.key?.id || 'unknown'} timestamp=${msgTimestamp || 'unknown'} fromMe=${Boolean(msg.key?.fromMe)} participant=${msg.key?.participant || 'unknown'}`);
        }
        if (msgTimestamp && msgTimestamp < CUTOFF_TIME && !isStatusEvent) continue;

        // Cache every incoming message, including commands, before dispatch so
        // a later revoke event can recover it for the owner inbox.
        cacheMessageForAntidelete(messageCache, msg, logger);

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const isMe = msg.key.fromMe;
        
        // Record activity
        if (resources.activeTracker) {
            resources.activeTracker.recordActivity(senderJid);
            global.activeUserCount = resources.activeTracker.getActiveUsers(300).length;
        }
        
        // Settings & Logic
        const prefix = settings.get('prefix', config.prefix);
        const mode = settings.get('mode', config.WORK_TYPE); // 'public' or 'private'
        
        if (mode === 'private' && !isMe && !isStatusChat(msg.key.remoteJid)) continue;

        const text = extractMessageText(normalizeMessageContent(msg.message) || msg.message).trim();
        if (text === '0' && resources.menuState?.get(senderJid) === 'settings') {
            resources.menuState.delete(senderJid);
            const timezone = config.timezone || 'Africa/Nairobi';
            const mainMenu = menuModule.getMenu(resources.commands || commands, timezone, Number(global.activeUserCount || 0));
            await sock.sendMessage(msg.key.remoteJid, { text: mainMenu }, { quoted: msg });
            continue;
        }
        if (!text || !text.startsWith(prefix)) {
            // Handle non-command logic like antidelete/antiedit/auto-react here
            await runWithContext(resources, async () => {
                await handleNonCommandLogic(sock, msg, resources);
            });
            continue;
        }

        const args = text.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const cmd = commands.get(commandName);
        if (!cmd) continue;

        if (commandToggle.isDisabled(commandName)) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Command *${commandName}* is currently disabled.` });
            continue;
        }

        logger.info(`[Command] ${commandName} from ${senderJid}`);
        await runWithContext(resources, async () => {
            await cmd.execute(sock, msg, args, resources);
        });

      } catch (err) {
        logger.error(`[MessageHandler] Error: ${err.message}`);
      }
    }
  });
}

function cacheMessageForAntidelete(messageCache, msg, logger) {
    try {
        const jid = msg.key?.remoteJid;
        const id = msg.key?.id;
        if (!jid || !id || !msg.message) return;
        const m = normalizeMessageContent(msg.message) || msg.message;
        const senderJid = msg.key.participant || jid;
        if (m.imageMessage) {
            messageCache.set(jid, id, { type: 'image', text: m.imageMessage.caption || '', rawMessage: m, originalMessage: msg, senderJid });
        } else if (m.videoMessage) {
            messageCache.set(jid, id, { type: 'video', text: m.videoMessage.caption || '', rawMessage: m, originalMessage: msg, senderJid });
        } else {
            const mediaType = ['audioMessage', 'documentMessage', 'stickerMessage', 'contactMessage', 'locationMessage'].find((key) => m[key]);
            const plainText = extractMessageText(m);
            if (mediaType) {
                messageCache.set(jid, id, { type: mediaType.replace('Message', ''), text: plainText, rawMessage: m, originalMessage: msg, senderJid });
            } else if (plainText) {
                messageCache.set(jid, id, { type: 'text', text: plainText, rawMessage: m, originalMessage: msg, senderJid });
            }
        }
    } catch (error) {
        logger.debug?.(`[MessageHandler] Antidelete cache skipped: ${error.message}`);
    }
}

function isViewOnceMessage(message) {
    const m = message || {};
    return Boolean(m.viewOnceMessage || m.viewOnceMessageV2 || m.viewOnceMessageV2Extension || m.ephemeralMessage?.message?.viewOnceMessage || m.ephemeralMessage?.message?.viewOnceMessageV2);
}

async function handleNonCommandLogic(sock, msg, resources) {
    const { settings, messageCache, logger, presenceManager } = resources;
    const rawMessage = msg.message;
    const m = normalizeMessageContent(rawMessage) || rawMessage;
    const jid = msg.key.remoteJid;
    const isStatus = isStatusChat(jid);

    if (presenceManager) {
        await presenceManager.sendHumanPresence(jid);
    }

    // Status automation is intentionally scoped to this BotInstance's settings.
    if (isStatus) {
        logger.info?.(`[MessageHandler] Status event received: type=${msg.messageTimestamp ? 'notify' : 'append'} id=${msg.key.id || 'unknown'} participant=${msg.key.participant || 'unknown'}`);
        if (!msg.key.fromMe && settings.get('autoview', true)) {
            await sock.readMessages([msg.key]).catch(() => {});
        }
        if (!msg.key.fromMe && (settings.get('autolike', false) || settings.get('autoreactstatus', false))) {
            let emoji = '❤️';
            if (settings.get('autoreactstatus', false)) {
                const configured = settings.get('autoreactemojis', ['💛', '❤️', '💜', '🤍', '💙']);
                const emojis = (Array.isArray(configured) ? configured : String(configured).split(','))
                    .map((value) => String(value).trim()).filter(Boolean);
                emoji = emojis[Math.floor(Math.random() * (emojis.length || 1))] || '❤️';
            }
            try {
                if (!msg.key.participant) {
                    logger.warn?.(`[MessageHandler] Auto status reaction skipped: missing status participant for ${msg.key.id || 'unknown'}; WhatsApp did not provide a valid status owner JID`);
                    return;
                }
                const participant = String(msg.key.participant);
                const statusJidList = [participant];
                await sock.sendMessage('status@broadcast', { react: { text: emoji, key: msg.key } }, {
                    statusJidList,
                });
                logger.info?.(`[MessageHandler] Auto status reaction sent: ${emoji} for ${msg.key.id || 'unknown'} participant=${participant}`);
            } catch (error) {
                const message = String(error?.message || error);
                if (/not[- ]acceptable/i.test(message)) {
                    const participant = String(msg.key.participant || 'unknown');
                    const now = Date.now();
                    const lastRejectedAt = resources.statusReactionRejections.get(participant) || 0;
                    if (now - lastRejectedAt >= STATUS_REJECTION_COOLDOWN_MS) {
                        resources.statusReactionRejections.set(participant, now);
                        logger.warn?.(`[MessageHandler] Auto status reaction rejected by WhatsApp for ${participant}: ${message}; verify the status owner has the bot number saved and that status privacy allows the bot account`);
                    } else {
                        logger.debug?.(`[MessageHandler] Suppressed repeated not-acceptable status reaction rejection for ${participant}`);
                    }
                } else {
                    logger.warn?.(`[MessageHandler] Auto status reaction failed: ${message}`);
                }
            }
        }
        return;
    }
    
    // Generic auto-react is opt-in and scoped to this BotInstance's settings.
    if (!isStatus && !msg.key.fromMe && settings.get('autoreact', false)) {
        const configured = settings.get('autoreactemojis', ['💖', '❤️', '✨']);
        const emojis = (Array.isArray(configured) ? configured : String(configured).split(','))
            .map((value) => String(value).trim()).filter(Boolean);
        const emoji = emojis[Math.floor(Math.random() * (emojis.length || 1))] || '❤️';
        await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } }).catch((error) => {
            logger.debug?.(`[MessageHandler] Generic auto-react failed: ${error.message}`);
        });
    }

    // ViewOnce auto-forward is opt-in and scoped per bot instance.
    if (!msg.key.fromMe && (isViewOnceMessage(rawMessage) || isViewOnceMessage(m))) {
        const allChats = Boolean(settings.get('viewonceallchats', false));
        const chats = settings.get('viewonceautoforwardChats', []);
        const enabledHere = allChats || (Array.isArray(chats) && chats.includes(jid));
        if (enabledHere && configOwner.ownerNumber) {
            const ownerJid = `${String(configOwner.ownerNumber).replace(/[^0-9]/g, '')}@s.whatsapp.net`;
            await sock.sendMessage(ownerJid, { forward: msg }).catch((error) => {
                logger.debug?.(`[MessageHandler] ViewOnce auto-forward failed: ${error.message}`);
            });
        }
    }

    // Auto Read
    if (settings.get('autoread', false) && !msg.key.fromMe) {
        await sock.readMessages([msg.key]).catch(() => {});
    }

    // Antidelete caching occurs before command/non-command dispatch so command
    // messages are recoverable too.

}

module.exports = { registerMessageHandler };
