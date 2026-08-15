'use strict';

const { proto, downloadMediaMessage, downloadContentFromMessage, normalizeMessageContent, isJidStatusBroadcast, jidNormalizedUser } = require('@whiskeysockets/baileys');
const config = require('../config/config');
const fs = require('fs');
const { writeFile } = require('fs/promises');
const path = require('path');
const moment = require('moment-timezone');
const { runWithContext } = require('../utils/context');

const REPORT_TZ = config.timezone || 'Africa/Nairobi';
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
  fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

const toBold = (text) => {
  const boldChars = {
    'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝗅', 'y': '𝘆', 'z': '𝘇',
    'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝘀', 'T': '𝘁', 'U': '𝘂', 'V': '𝘃', 'W': '𝘄', 'X': '𝗅', 'Y': '𝘆', 'Z': '𝘇',
    '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
  };
  return text.split('').map(c => boldChars[c] || c).join('');
};
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

function ownerJid(resources = {}) {
  const context = require('../utils/context').getContext() || {};
  const configuredOwner = resources.ownerNumber || context.ownerNumber || context.instanceNumber || configOwner.ownerNumber;
  const number = String(configuredOwner || '').replace(/[^0-9]/g, '');
  return number ? `${number}@s.whatsapp.net` : null;
}

async function recoverDeletedMessage(sock, key, resources) {
  const { settings, messageCache, logger } = resources;
  if (!settings.get('antidelete', false) || !key?.remoteJid || !key?.id) return;

  const destination = settings.get('antideleteDest', 'p') === 'g'
    ? key.remoteJid
    : ownerJid(resources);
  if (!destination) {
    logger.warn?.('[MessageHandler] Antidelete enabled but no owner number is configured');
    return;
  }

  const cached = messageCache.get(key.remoteJid, key.id);
  if (!cached) {
    await sock.sendMessage(destination, {
      text: `🗑️ *Deleted message detected*\n\nMessage ID: ${key.id}\nThe original content was not cached before deletion.`,
    }).catch((error) => logger.warn?.(`[MessageHandler] Antidelete notice failed: ${error.message}`));
    return;
  }

  try {
    const sender = cached.senderJid;
    const senderName = sender.split('@')[0];
    const nowStamp = () => moment().tz(REPORT_TZ).format('DD-MMM-YYYY hh:mm:ss A');
    
    let report = `╭━━━〔 ${toBold("ANTI-DELETE REPORT")} 〕━━━┈⊷\n` +
                 `┃ 👤 ${toBold("Sender:")} @${senderName}\n` +
                 `┃ 🕒 ${toBold("Sent At:")} ${cached.sentAtMs ? moment(cached.sentAtMs).tz(REPORT_TZ).format('DD-MMM-YYYY hh:mm:ss A') : 'Unknown'}\n` +
                 `┃ 🗑️ ${toBold("Deleted/Detected At:")} ${nowStamp()}\n` +
                 `┃ 📂 ${toBold("Type:")} ${cached.type || 'Text'}\n`;
    
    if (cached.groupJid) {
        report += `┃ 👥 ${toBold("Group:")} ${cached.groupJid}\n`;
    }
    
    report += `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n`;

    if (cached.text) {
        report += `📝 ${toBold("Message Content:")}\n${cached.text}`;
    }

    // Send report
    await sock.sendMessage(destination, { text: report, mentions: [sender] });

    // Send media if available
    if (cached.mediaPath && fs.existsSync(cached.mediaPath)) {
        const mediaOptions = { caption: `*Deleted ${cached.type}* from @${senderName}`, mentions: [sender] };
        if (cached.type === 'image') await sock.sendMessage(destination, { image: { url: cached.mediaPath }, ...mediaOptions });
        else if (cached.type === 'sticker') await sock.sendMessage(destination, { sticker: { url: cached.mediaPath }, ...mediaOptions });
        else if (cached.type === 'video') await sock.sendMessage(destination, { video: { url: cached.mediaPath }, ...mediaOptions });
        else if (cached.type === 'audio') await sock.sendMessage(destination, { audio: { url: cached.mediaPath }, mimetype: 'audio/mp4', ...mediaOptions });
        
        // Clean up after 5 seconds
        setTimeout(() => {
            try { if (fs.existsSync(cached.mediaPath)) fs.unlinkSync(cached.mediaPath); } catch (err) {}
        }, 5000);
    } else if (cached.type !== 'text' && cached.originalMessage) {
        // Fallback to copyNForward if media download failed but we have the original object
        if (typeof sock.copyNForward === 'function') {
            await sock.copyNForward(destination, cached.originalMessage, true);
        }
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

  sock.ev.on('messages.reaction', async (reactions) => {
    try {
      for (const reaction of reactions) {
        const helpCmd = resources.commands?.get('help');
        if (helpCmd && typeof helpCmd.handleHelpReaction === 'function') {
          await helpCmd.handleHelpReaction(sock, reaction, resources);
        }
      }
    } catch (e) {
      logger.error?.(`[MessageHandler] Reaction handler error: ${e.message}`);
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

        // Optimization: Only cache for antidelete if the feature is actually enabled
        if (settings.get('antidelete', false)) {
            await cacheMessageForAntidelete(messageCache, msg, logger);
        }

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

async function cacheMessageForAntidelete(messageCache, msg, logger) {
    try {
        const jid = msg.key?.remoteJid;
        const id = msg.key?.id;
        if (!jid || !id || !msg.message) return;

        // Don't cache protocol messages (like revokes themselves)
        if (msg.message.protocolMessage) return;

        const m = normalizeMessageContent(msg.message) || msg.message;
        const senderJid = msg.key.participant || jid;
        const sentAtMs = msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now();

        const downloadMedia = async (msgContent, type, ext) => {
            try {
                const stream = await downloadContentFromMessage(msgContent, type);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                    if (buffer.length > 50 * 1024 * 1024) break; // 50MB limit
                }
                const p = path.join(TEMP_MEDIA_DIR, `${id}.${ext}`);
                await writeFile(p, buffer);
                return p;
            } catch (e) {
                logger.debug?.(`[MessageHandler] Antidelete download error (${type}): ${e.message}`);
                return '';
            }
        };

        let mediaPath = '';
        let type = 'text';
        let text = extractMessageText(m);

        if (m.imageMessage) {
            type = 'image';
            mediaPath = await downloadMedia(m.imageMessage, 'image', 'jpg');
        } else if (m.videoMessage) {
            type = 'video';
            mediaPath = await downloadMedia(m.videoMessage, 'video', 'mp4');
        } else if (m.stickerMessage) {
            type = 'sticker';
            mediaPath = await downloadMedia(m.stickerMessage, 'sticker', 'webp');
        } else if (m.audioMessage) {
            type = 'audio';
            mediaPath = await downloadMedia(m.audioMessage, 'audio', 'mp3');
        } else {
            const mediaKey = ['documentMessage', 'contactMessage', 'locationMessage'].find((key) => m[key]);
            if (mediaKey) type = mediaKey.replace('Message', '');
        }

        messageCache.set(jid, id, {
            type,
            text,
            mediaPath,
            senderJid,
            sentAtMs,
            groupJid: jid.endsWith('@g.us') ? jid : null,
            rawMessage: m,
            originalMessage: msg
        });
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
    const isGroup = jid.endsWith('@g.us');

    const shouldRun = (key) => {
        const val = settings.get(key, false);
        if (!val || val === 'off' || val === false) return false;
        if (val === 'all' || val === true) return true;
        if (val === 'p' && !isGroup) return true;
        if (val === 'g' && isGroup) return true;
        return false;
    };

    if (presenceManager) {
        // Optimization: Non-blocking presence updates to prevent message handler lag in busy groups
        presenceManager.sendHumanPresence(jid).catch(() => {});
    }

    // Status automation is intentionally scoped to this BotInstance's settings.
    if (isStatus) {
        logger.info?.(`[MessageHandler] Status event received: type=${msg.messageTimestamp ? 'notify' : 'append'} id=${msg.key.id || 'unknown'} participant=${msg.key.participant || 'unknown'}`);
        
        const isFromMe = msg.key.fromMe;
        const participant = msg.key.participant || msg.participant;
        const botJid = jidNormalizedUser(sock.user.id);

        if (settings.get('autoview', true) || settings.get('autolike', false) || settings.get('autoreactstatus', false)) {
            await sock.readMessages([msg.key]).catch(() => {});
        }

        if (settings.get('autolike', false) || settings.get('autoreactstatus', false)) {
            let emoji = '❤️';
            if (settings.get('autoreactstatus', false)) {
                const configured = settings.get('autoreactemojis', ['💛', '❤️', '💜', '🤍', '💙', '🔥', '✨', '⚡', '🌈', '💖']);
                const emojis = (Array.isArray(configured) ? configured : String(configured).split(','))
                    .map((value) => String(value).trim()).filter(Boolean);
                emoji = emojis[Math.floor(Math.random() * (emojis.length || 1))] || '❤️';
            }
            try {
                if (!participant) {
                    logger.warn?.(`[MessageHandler] Auto status reaction skipped: missing status participant for ${msg.key.id || 'unknown'}`);
                    return;
                }
                const statusJidList = [jidNormalizedUser(participant)];
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

        if (settings.get('autoreplystatus', false)) {
            const replyText = settings.get('statusreplytext', 'Nice status! ✅');
            try {
                const statusJidList = [jidNormalizedUser(participant), botJid];
                await sock.sendMessage(participant, { text: replyText }, { quoted: msg });
                logger.info?.(`[MessageHandler] Auto status reply sent to ${participant}`);
            } catch (error) {
                logger.warn?.(`[MessageHandler] Auto status reply failed for ${participant}: ${error.message}`);
            }
        }

        return;
    }
    
    // Generic auto-react is opt-in and scoped to this BotInstance's settings.
    if (!isStatus && !msg.key.fromMe && shouldRun('autoreact')) {
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
    if (shouldRun('autoread') && !msg.key.fromMe) {
        await sock.readMessages([msg.key]).catch(() => {});
    }

    // Antidelete caching occurs before command/non-command dispatch so command
    // messages are recoverable too.

}

module.exports = { registerMessageHandler };
