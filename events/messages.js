'use strict';

const { proto, downloadMediaMessage } = require('@whiskeysockets/baileys');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');
const { runWithContext } = require('../utils/context');
const menuModule = require('../media/menu.js');

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

function registerMessageHandler(sock, commands, resources) {
  const { settings, groupSettings, messageCache, commandToggle, logger } = resources;
  
  // Per-instance cutoff to avoid processing old messages
  const CUTOFF_TIME = Math.floor(Date.now() / 1000);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (!msg.message) continue;

        const msgTimestamp = Number(msg.messageTimestamp);
        if (msgTimestamp && msgTimestamp < CUTOFF_TIME) continue;

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
        
        if (mode === 'private' && !isMe && msg.key.remoteJid !== 'status@broadcast') continue;

        const text = extractMessageText(msg.message).trim();
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

async function handleNonCommandLogic(sock, msg, resources) {
    const { settings, messageCache, logger, presenceManager } = resources;
    const m = msg.message;
    const jid = msg.key.remoteJid;

    if (presenceManager) {
        await presenceManager.sendHumanPresence(jid);
    }

    // Status automation is intentionally scoped to this BotInstance's settings.
    if (jid === 'status@broadcast') {
        if (!msg.key.fromMe && settings.get('autoview', true)) {
            await sock.readMessages([msg.key]).catch(() => {});
        }
        if (!msg.key.fromMe && (settings.get('autolike', false) || settings.get('autoreactstatus', false))) {
            const configured = settings.get('autoreactemojis', ['💛', '❤️', '💜', '🤍', '💙']);
            const emojis = (Array.isArray(configured) ? configured : String(configured).split(','))
                .map((emoji) => String(emoji).trim()).filter(Boolean);
            const emoji = emojis[Math.floor(Math.random() * (emojis.length || 1))] || '❤️';
            await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } }).catch((error) => {
                logger.debug?.(`[MessageHandler] Auto status reaction failed: ${error.message}`);
            });
        }
        return;
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
