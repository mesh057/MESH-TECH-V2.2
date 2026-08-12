'use strict';

const { proto, downloadMediaMessage, normalizeMessageContent, isJidStatusBroadcast } = require('@whiskeysockets/baileys');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');
const { runWithContext } = require('../utils/context');
const menuModule = require('../media/menu.js');
const configOwner = config;

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

function registerMessageHandler(sock, commands, resources) {
  const { settings, groupSettings, messageCache, commandToggle, logger } = resources;
  
  // Per-instance cutoff to avoid processing old messages
  const CUTOFF_TIME = Math.floor(Date.now() / 1000);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;

    for (const msg of messages) {
      try {
        if (!msg.message) continue;

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
                    throw new Error('status reaction skipped: missing status participant');
                }
                const participant = String(msg.key.participant);
                const botJid = sock.user?.id ? String(sock.user.id) : '';
                const normalizedBotJid = botJid.replace(/:\d+(?=@)/, '');
                const statusJidLists = [
                    [participant, botJid].filter(Boolean),
                    [participant, normalizedBotJid].filter(Boolean),
                    [participant],
                ].filter((list, index, all) => list.length > 0 && all.findIndex((candidate) => candidate.join('|') === list.join('|')) === index);
                let lastError;
                for (const statusJidList of statusJidLists) {
                    try {
                        await sock.sendMessage(msg.key.remoteJid || 'status@broadcast', { react: { text: emoji, key: msg.key } }, {
                            statusJidList,
                        });
                        logger.info?.(`[MessageHandler] Auto status reaction sent: ${emoji} for ${msg.key.id || 'unknown'} participants=${statusJidList.join(',')}`);
                        lastError = undefined;
                        break;
                    } catch (error) {
                        lastError = error;
                        const message = String(error?.message || error);
                        if (!/not[- ]acceptable/i.test(message)) break;
                        logger.warn?.(`[MessageHandler] Status reaction rejected for participants=${statusJidList.join(',')}; trying compatibility fallback`);
                    }
                }
                if (lastError) throw lastError;
            } catch (error) {
                logger.warn?.(`[MessageHandler] Auto status reaction failed: ${error.message}`);
            }
        }
        return;
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

    // Cache message for antidelete/edit
    try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        if (m.imageMessage) {
            messageCache.set(jid, msg.key.id, {
                type: 'image',
                text: m.imageMessage.caption || '',
                rawMessage: { imageMessage: m.imageMessage },
                senderJid,
            });
        } else if (m.videoMessage) {
            messageCache.set(jid, msg.key.id, {
                type: 'video',
                text: m.videoMessage.caption || '',
                rawMessage: { videoMessage: m.videoMessage },
                senderJid,
            });
        } else {
            const plainText = extractMessageText(m);
            if (plainText) {
                messageCache.set(jid, msg.key.id, { type: 'text', text: plainText, senderJid });
            }
        }
    } catch (e) {}
}

module.exports = { registerMessageHandler };
