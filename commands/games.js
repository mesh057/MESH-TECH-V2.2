/**
 * games.js — game commands: flag, math, guessnumber, scramble, riddle, emoji
 */
'use strict';
const axios = require('axios');

/* Share state with events/messages.js game handler */
const { activeGames } = require('./game');

module.exports = [
  {
    name: 'flag',
    description: 'Guess the country from its flag emoji.',
    category: 'GAME',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const flags = [
        { emoji: '🇰🇪', name: 'Kenya' }, { emoji: '🇺🇸', name: 'United States' }, { emoji: '🇯🇵', name: 'Japan' },
        { emoji: '🇧🇷', name: 'Brazil' }, { emoji: '🇩🇪', name: 'Germany' }, { emoji: '🇮🇳', name: 'India' },
        { emoji: '🇫🇷', name: 'France' }, { emoji: '🇳🇬', name: 'Nigeria' }, { emoji: '🇪🇬', name: 'Egypt' },
        { emoji: '🇨🇦', name: 'Canada' }, { emoji: '🇦🇺', name: 'Australia' }, { emoji: '🇬🇭', name: 'Ghana' },
        { emoji: '🇿🇦', name: 'South Africa' }, { emoji: '🇪🇹', name: 'Ethiopia' }, { emoji: '🇹🇿', name: 'Tanzania' },
        { emoji: '🇺🇬', name: 'Uganda' }, { emoji: '🇨🇲', name: 'Cameroon' }, { emoji: '🇲🇽', name: 'Mexico' },
        { emoji: '🇮🇹', name: 'Italy' }, { emoji: '🇪🇸', name: 'Spain' },
      ];
      const pick = flags[Math.floor(Math.random() * flags.length)];
      activeGames.set(jid, { type: 'flag', answer: pick.name.toLowerCase() });
      await sock.sendMessage(jid, { text: `🚩 *𝗠𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *FLAG QUIZ*\n\n🚩 ${pick.emoji}\n\n👉 Reply with the country name! (Hint: starts with "${pick.name[0]}")` }, { quoted: msg });
      setTimeout(() => {
        if (activeGames.get(jid)?.type === 'flag') {
          activeGames.delete(jid);
          sock.sendMessage(jid, { text: `⏰ Time's up! The flag was *${pick.name}*.` }).catch(() => {});
        }
      }, 30000);
    },
  },
  {
    name: 'math',
    description: 'Quick mental math challenge.',
    category: 'GAME',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const ops = ['+', '-', '×'];
      const a = Math.floor(Math.random() * 50) + 1;
      const b = Math.floor(Math.random() * 50) + 1;
      const op = ops[Math.floor(Math.random() * ops.length)];
      let answer;
      if (op === '+') answer = a + b;
      else if (op === '-') answer = a - b;
      else answer = a * b;
      activeGames.set(jid, { type: 'math', answer: String(answer) });
      await sock.sendMessage(jid, { text: `🧮 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *MATH QUIZ*\n\n📐 Solve: *${a} ${op} ${b} = ?*\n\n👉 Reply with your answer! (30s)` }, { quoted: msg });
      setTimeout(() => {
        if (activeGames.get(jid)?.type === 'math') {
          activeGames.delete(jid);
          sock.sendMessage(jid, { text: `⏰ Time's up! Answer: *${answer}*` }).catch(() => {});
        }
      }, 30000);
    },
  },
  {
    name: 'guessnumber',
    description: 'Guess the secret number (1-20).',
    category: 'GAME',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (!msg.key.fromMe === false && !msg.key.participant) {}
      const num = Math.floor(Math.random() * 20) + 1;
      activeGames.set(jid, { type: 'number', target: num, attempts: 0, fromGuessCmd: true });
      await sock.sendMessage(jid, { text: `🔢 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *GUESS THE NUMBER*\n\n🎯 I picked a number between *1* and *20*.\n\n👉 Reply with your guess!` }, { quoted: msg });
      setTimeout(() => {
        const g = activeGames.get(jid);
        if (g?.type === 'number' && g.fromGuessCmd) {
          activeGames.delete(jid);
          sock.sendMessage(jid, { text: `⏰ Time's up! The number was *${num}*.` }).catch(() => {});
        }
      }, 45000);
    },
  },
  {
    name: 'scramble',
    description: 'Unscramble the word.',
    category: 'GAME',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const words = ['mesh', 'whatsapp', 'bot', 'kenya', 'nairobi', 'coding', 'javascript', 'android', 'matrix', 'dragon', 'samurai', 'phantom', 'infinity', 'cipher'];
      const word = words[Math.floor(Math.random() * words.length)];
      const scrambled = [...word].sort(() => Math.random() - 0.5).join('');
      activeGames.set(jid, { type: 'scramble', answer: word });
      await sock.sendMessage(jid, { text: `🔤 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *WORD SCRAMBLE*\n\n🧩 Unscramble: *${scrambled.toUpperCase()}*\n\n👉 Reply with the word!` }, { quoted: msg });
      setTimeout(() => {
        if (activeGames.get(jid)?.type === 'scramble') {
          activeGames.delete(jid);
          sock.sendMessage(jid, { text: `⏰ Time's up! The word was *${word}*.` }).catch(() => {});
        }
      }, 30000);
    },
  },
  {
    name: 'riddle',
    description: 'Get a random riddle.',
    category: 'GAME',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      try {
        const { data } = await axios.get('https://riddles-api.vercel.app/random', { timeout: 15000 });
        await sock.sendMessage(jid, { text: `🧠 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *RIDDLE*\n\n❓ ${data.riddle}\n\n💡 Answer: ||${data.answer}||` }, { quoted: msg });
      } catch (err) {
        const fallback = '❓ I speak without a mouth and hear without ears. I have no body, but I come alive with the wind.\n\n💡 Answer: ||An echo||';
        await sock.sendMessage(jid, { text: `🧠 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *RIDDLE*\n\n${fallback}` }, { quoted: msg });
      }
    },
  },
  {
    name: 'emoji',
    description: 'Make a big emoji art from an emoji. Usage: .emoji 😀',
    category: 'GAME',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const emojiChar = args.join(' ').trim() || '😀';
      // Build a big emoji using the emoji itself repeated in a block
      const line = emojiChar.repeat(6);
      const art = `☣ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *EMOJI ART*\n\n${line}\n${line}\n${line}\n${line}\n${line}\n${line}`;
      await sock.sendMessage(jid, { text: art }, { quoted: msg });
    },
  },
];

module.exports.checkAnswer = function (jid, text) {
  const game = activeGames.get(jid);
  if (!game) return null;
  const clean = String(text).trim().toLowerCase();
  if (game.type === 'number') return null; // handled by events/messages.js
  if (clean === String(game.answer)) {
    activeGames.delete(jid);
    return { win: true, answer: game.answer, type: game.type };
  }
  if (['flag', 'math', 'scramble'].includes(game.type)) {
    return { win: false };
  }
  return null;
};
