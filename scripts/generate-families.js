#!/usr/bin/env node
/**
 * generate-families.js
 * Generates the anime-pic, react-gif, fun, and text-effect command files
 * using verified working APIs (nekos.best, pollinations.ai, opentdb, etc.)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '../commands');

const UA = 'MESH-TECH-BOT/2.2 (whatsapp-bot; mesh057) node/22';

// ---------------------------------------------------------------
// 1. Anime picture commands (neko, waifu, kitsune pngs; character pics via pollinations)
// ---------------------------------------------------------------
const nekoCats = {
  neko: { cat: 'neko', emoji: '🐱' },
  neko2: { cat: 'neko', emoji: '🐱', alias: true },
  waifu: { cat: 'waifu', emoji: '🌸' },
  kitsune: { cat: 'kitsune', emoji: '🦊' },
  husbu: { cat: 'husbando', emoji: '🌸' },
};

// Character-specific anime picture commands -> pollinations prompt
const characterPics = {
  akiyama: 'Akiyama Mio from K-On anime, high quality anime art',
  ana: 'Ana, cute anime girl, high quality anime art',
  asuna: 'Asuna Yuuki from Sword Art Online, high quality anime art',
  ayuzawa: 'Misaki Ayuzawa from Kaichou wa Maid-sama, high quality anime art',
  boruto: 'Boruto Uzumaki, high quality anime art',
  bts: 'BTS K-pop group, high quality stylish wallpaper',
  cartoon: 'colorful cute cartoon character, high quality digital art',
  chiho: 'Chiho, cute anime girl, high quality anime art',
  chitoge: 'Chitoge Kirisaki from Nisekoi, high quality anime art',
  cosplay: 'cosplay anime girl, high quality photo',
  cosplayloli: 'loli cosplay anime, high quality photo',
  cosplaysagiri: 'Sagiri Izumi cosplay, high quality photo',
  deidara: 'Deidara from Naruto, high quality anime art',
  doraemon: 'Doraemon, high quality anime art',
  elaina: 'Elaina from Wandering Witch, high quality anime art',
  emilia: 'Emilia from Re:Zero, high quality anime art',
  erza: 'Erza Scarlet from Fairy Tail, high quality anime art',
  exo: 'EXO K-pop group, high quality wallpaper',
  hinata: 'Hinata Hyuga from Naruto, high quality anime art',
  husbu2: 'husband waifu anime, high quality anime art',
  itachi: 'Itachi Uchiha from Naruto, high quality anime art',
  itachiuchiha: 'Itachi Uchiha from Naruto, high quality anime art',
  itori: 'Itori, anime girl, high quality anime art',
  jsj: 'Jujutsu Kaisen, high quality anime art',
  mikasa: 'Mikasa Ackerman from Attack on Titan, high quality anime art',
  nezuko: 'Nezuko Kamado from Demon Slayer, high quality anime art',
  yumeko: 'Yumeko Jabami from Kakegurui, high quality anime art',
  luffy: 'Monkey D Luffy from One Piece, high quality anime art',
  megumin: 'Megumin from KonoSuba, high quality anime art',
  rem: 'Rem from Re:Zero, high quality anime art',
  zerotwo: 'Zero Two from Darling in the Franxx, high quality anime art',
  shinobu: 'Shinobu Kocho from Demon Slayer, high quality anime art',
  kurumi: 'Kurumi Tokisaki from Date A Live, high quality anime art',
};

// Photo commands from reference: art, wallpaper, gamewallpaper, cyber, greymory(hestia?), hacker, hestia, jibril, rose, technology, pubg, freefire, mountain, islamic, dog, imgcat
const photoPics = {
  art: 'stunning digital anime art, high quality',
  wallpaper: 'beautiful 4k wallpaper landscape, high quality',
  gamewallpaper: 'epic 4k gaming wallpaper, high quality',
  cyber: 'cyberpunk city neon, high quality wallpaper',
  greymory: 'Rias Gremory from High School DxD, high quality anime art',
  hacker: 'hacker coding dark theme, high quality wallpaper',
  hestia: 'Hestia from DanMachi, high quality anime art',
  jibril: 'Jibril from No Game No Life, high quality anime art',
  rose: 'beautiful red roses closeup, high quality photo',
  technology: 'futuristic technology, high quality wallpaper',
  pubg: 'PUBG game wallpaper, high quality',
  freefire: 'Garena Free Fire game wallpaper, high quality',
  mountain: 'breathtaking mountain scenery 4k, high quality photo',
  islamic: 'beautiful islamic art, high quality',
  dog: 'cute dog photo, high quality',
  imgcat: 'cute cat photo, high quality',
};

function nekoCmd(name, { cat, emoji }) {
  return `const axios = require('axios');
const UA = '${UA}';
module.exports = {
  name: '${name}',
  ${cat === 'waifu' ? "aliases: ['waifu'], " : ''}description: 'Fetch a random ${cat} picture (nekos.best).',
  category: 'ANIME',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://nekos.best/api/v2/${cat}?amount=1', {
        headers: { 'User-Agent': UA, 'Referer': 'https://nekos.best/' },
        timeout: 20000,
      });
      const url = data?.results?.[0]?.url;
      if (!url) throw new Error('no result');
      await sock.sendMessage(jid, { image: { url }, caption: '🌸 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  ${emoji} ${name.toUpperCase()}' }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: \`❌ Failed to fetch ${cat} image: \${err.message}\` }, { quoted: msg });
    }
  },
};
`;
}

function characterCmd(name, prompt) {
  const safe = encodeURIComponent(prompt);
  return `module.exports = {
  name: '${name}',
  description: 'Fetch a ${name} anime picture (pollinations.ai).',
  category: 'ANIME',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const url = \`https://image.pollinations.ai/prompt/\${encodeURIComponent('${prompt}')}\${encodeURIComponent('')}?width=768&height=768&nologo=true&seed=\${Math.floor(Math.random() * 999999)}\`;
      await sock.sendMessage(jid, { image: { url }, caption: \`🌸 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *${name.toUpperCase()}*\` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: \`❌ Failed to fetch ${name} image: \${err.message}\` }, { quoted: msg });
    }
  },
};
`;
}

// ---------------------------------------------------------------
// 2. React gif commands (nekos.best gif cats)
// ---------------------------------------------------------------
const reactCats = {
  kill: { cat: 'kick', emoji: '🪅' },
  pat: { cat: 'pat', emoji: '🪅' },
  cry: { cat: 'cry', emoji: '🪅' },
  hug: { cat: 'hug', emoji: '🪅' },
  kiss: { cat: 'kiss', emoji: '🪅' },
  slap: { cat: 'slap', emoji: '🪅' },
  sad: { cat: 'cry', emoji: '🪅' },
  bite: { cat: 'bite', emoji: '🪅' },
  baka: { cat: 'baka', emoji: '🪅' },
  smile: { cat: 'smile', emoji: '🪅' },
  love: { cat: 'kiss', emoji: '🪅' },
  blush: { cat: 'blush', emoji: '🪅' },
  cuddle: { cat: 'cuddle', emoji: '🪅' },
};

function reactCmd(name, { cat, emoji }) {
  return `const axios = require('axios');
const UA = '${UA}';
module.exports = {
  name: '${name}',
  description: 'Send a ${name} reaction gif (nekos.best).',
  category: 'REACT',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://nekos.best/api/v2/${cat}?amount=1', {
        headers: { 'User-Agent': UA, 'Referer': 'https://nekos.best/' },
        timeout: 20000,
      });
      const gif = data?.results?.[0]?.url;
      if (!gif) throw new Error('no result');
      const mention = msg.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;
      await sock.sendMessage(jid, { video: { url: gif }, gifPlayback: true, caption: mention ? \`🪅 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *${emoji} ${name.toUpperCase()}* @\${mention.split('@')[0]}\` : \`🪅 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *${emoji} ${name.toUpperCase()}*\`, mentions: mention ? [mention] : undefined }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: \`❌ Failed to fetch ${name} gif: \${err.message}\` }, { quoted: msg });
    }
  },
};
`;
}

// ---------------------------------------------------------------
// 3. Fun commands: joke, meme, anime(waifu gif), quote, truthordare, eightball, roast, fact, historyfact, captions, trivia
// ---------------------------------------------------------------
const funCmds = {
  joke: `const axios = require('axios');
module.exports = {
  name: 'joke',
  description: 'Fetch a random joke.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://official-joke-api.appspot.com/random_joke', { timeout: 15000 });
      await sock.sendMessage(jid, { text: \`⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *𝗝𝗢𝗞𝗘*\\n\\n🤣 \${data.setup}\\n\\n😂 \${data.punchline}\` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: \`❌ Failed to fetch joke: \${err.message}\` }, { quoted: msg });
    }
  },
};
`,
  meme: `const axios = require('axios');
module.exports = {
  name: 'meme',
  description: 'Fetch a random meme.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://meme-api.com/gimme', { timeout: 20000 });
      const cap = '⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *𝗠𝗘𝗠𝗘*' + String.fromCharCode(10) + String.fromCharCode(10) + '🤣 ' + data.title + String.fromCharCode(10) + '(r/' + data.subreddit + ')';
      await sock.sendMessage(jid, { image: { url: data.url }, caption: cap }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: \`❌ Failed to fetch meme: \${err.message}\` }, { quoted: msg });
    }
  },
};
`,
  anime: `const axios = require('axios');
const UA = '${UA}';
module.exports = {
  name: 'anime',
  description: 'Fetch a random anime picture.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://nekos.best/api/v2/waifu?amount=1', {
        headers: { 'User-Agent': UA, 'Referer': 'https://nekos.best/' },
        timeout: 20000,
      });
      const url = data?.results?.[0]?.url;
      if (!url) throw new Error('no result');
      await sock.sendMessage(jid, { image: { url }, caption: '🌸 *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *ANIME*' }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: \`❌ Failed to fetch anime picture: \${err.message}\` }, { quoted: msg });
    }
  },
};
`,
  quote: `const axios = require('axios');
module.exports = {
  name: 'quote',
  description: 'Fetch a random inspirational quote.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://zenquotes.io/api/random', { timeout: 15000 });
      const q = Array.isArray(data) ? data[0] : data;
      await sock.sendMessage(jid, { text: \`⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *𝗤𝗨𝗢𝗧𝗘*\\n\\n💭 "\${q.q}"\\n\\n— \${q.a}\` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: \`❌ Failed to fetch quote: \${err.message}\` }, { quoted: msg });
    }
  },
};
`,
  truthordare: `const axios = require('axios');
module.exports = {
  name: 'truthordare',
  aliases: ['tod'],
  description: 'Get a random Truth or Dare challenge.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const pick = Math.random() < 0.5 ? 'truth' : 'dare';
      const { data } = await axios.get(\`https://api.truthordarebot.xyz/v1/\${pick}\`, { timeout: 15000 });
      const label = pick === 'truth' ? '🎭 TRUTH' : '🔥 DARE';
      await sock.sendMessage(jid, { text: \`⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *TRUTH OR DARE*\\n\\n\${label}\\n\\n👉 \${data.question}\` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: \`❌ Failed to fetch truth or dare: \${err.message}\` }, { quoted: msg });
    }
  },
};
`,
  eightball: `module.exports = {
  name: 'eightball',
  aliases: ['8ball'],
  description: 'Ask the magic 8-ball a question.',
  category: 'FUN',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const answers = [
      '🎱 It is certain.', '🎱 It is decidedly so.', '🎱 Without a doubt.',
      '🎱 Yes, definitely.', '🎱 You may rely on it.', '🎱 As I see it, yes.',
      '🎱 Most likely.', '🎱 Outlook good.', '🎱 Yes.', '🎱 Signs point to yes.',
      '🎱 Reply hazy, try again.', '🎱 Ask again later.', '🎱 Better not tell you now.',
      '🎱 Cannot predict now.', '🎱 Concentrate and ask again.', '🎱 Don\\'t count on it.',
      '🎱 My reply is no.', '🎱 My sources say no.', '🎱 Outlook not so good.',
      '🎱 Very doubtful.',
    ];
    const answer = answers[Math.floor(Math.random() * answers.length)];
    const question = args.join(' ') || '(no question asked)';
    await sock.sendMessage(jid, { text: \`⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *MAGIC 8-BALL*\\n\\n❓ You asked: \${question}\\n\\n🎱 Answer: \${answer}\` }, { quoted: msg });
  },
};
`,
  roast: `module.exports = {
  name: 'roast',
  description: 'Roast yourself or a mentioned member.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = msg.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant || msg.key.participant;
    const targetName = target ? \`@\${target.split('@')[0]}\` : 'you';
    const roasts = [
      \`\${targetName}, you bring everyone so much joy... when you leave the room. 😏\`,
      \`\${targetName}, I'd agree with you but then we'd both be wrong. 😌\`,
      \`\${targetName}, you're not stupid; you just have bad luck thinking. 🧠\`,
      \`\${targetName}, your secrets are safe with me... I never listen. 🤫\`,
      \`\${targetName}, you have something on your chin... no, the 3rd one down. 😶\`,
      \`\${targetName}, you bring everyone a lot of joy, when you leave. 🚪\`,
      \`\${targetName}, I'd tell you a joke about UDP but you wouldn't get it. 📡\`,
      \`\${targetName}, you're proof that evolution can go in reverse. 🐒\`,
      \`\${targetName}, your Wi-Fi is stronger than your personality. 📶\`,
      \`\${targetName}, even your GPS gave up on you. 🗺️\`,
    ];
    const roast = roasts[Math.floor(Math.random() * roasts.length)];
    await sock.sendMessage(jid, { text: \`⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *ROAST*\\n\\n🔥 \${roast}\`, mentions: target ? [target] : undefined }, { quoted: msg });
  },
};
`,
  fact: `const axios = require('axios');
module.exports = {
  name: 'fact',
  description: 'Fetch a random interesting fact.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', { timeout: 15000 });
      await sock.sendMessage(jid, { text: \`⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *FACT*\\n\\n💡 \${data.text}\` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: \`❌ Failed to fetch fact: \${err.message}\` }, { quoted: msg });
    }
  },
};
`,
  historyfact: `const axios = require('axios');
module.exports = {
  name: 'historyfact',
  aliases: ['hfact'],
  description: 'Fetch a random historical event that happened on this day.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const month = new Date().getMonth() + 1;
      const day = new Date().getDate();
      const { data } = await axios.get(\`https://numbersapi.com/\${month}/\${day}/date?json\`, { timeout: 15000 });
      await sock.sendMessage(jid, { text: \`⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *HISTORY FACT*\\n\\n📜 On \${month}/\${day}:\\n\\n\${data.text}\` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: \`❌ Failed to fetch history fact: \${err.message}\` }, { quoted: msg });
    }
  },
};
`,
  captions: `const axios = require('axios');
module.exports = {
  name: 'captions',
  description: 'Get a random bio/caption idea.',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://github.com/Blackstar-12/Bio/raw/main/Bio.txt', { timeout: 15000 });
      const lines = String(data || '').split('\\n').filter(l => l.trim());
      const line = lines[Math.floor(Math.random() * lines.length)] || 'No captions available.';
      await sock.sendMessage(jid, { text: \`⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *CAPTION*\\n\\n✨ \${line}\` }, { quoted: msg });
    } catch (err) {
      const backup = '✨ Live life like a story worth telling.';
      await sock.sendMessage(jid, { text: \`⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *CAPTION*\\n\\n\${backup}\` }, { quoted: msg });
    }
  },
};
`,
  trivia: `const axios = require('axios');
module.exports = {
  name: 'trivia',
  description: 'Get a random trivia question (Open Trivia DB).',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple', { timeout: 15000 });
      const r = data.results?.[0];
      if (!r) throw new Error('no result');
      const choices = [...r.incorrect_answers, r.correct_answer].sort(() => Math.random() - 0.5);
      const letters = ['A', 'B', 'C', 'D'];
      const list = choices.map((c, i) => letters[i] + '. ' + c).join(String.fromCharCode(10));
      const text = '⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *TRIVIA*' + String.fromCharCode(10) + String.fromCharCode(10) + '❓ ' + r.question + String.fromCharCode(10) + String.fromCharCode(10) + list + String.fromCharCode(10) + String.fromCharCode(10) + '(Answer: ' + r.correct_answer + ')';
      await sock.sendMessage(jid, { text }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: \`❌ Failed to fetch trivia: \${err.message}\` }, { quoted: msg });
    }
  },
};
`,
};

// ---------------------------------------------------------------
// 4. Text effect commands: fancy, fliptext, smallcaps, strike, bubble, zalgo, zalgo2, reverse, shapar, tte, readmore
// ---------------------------------------------------------------
function readCmd(name) {
  return fs.readFileSync(path.join(__dirname, `${name}.tmpl`), 'utf8');
}

// ---- write files ----
for (const [name, cfg] of Object.entries(nekoCats)) {
  fs.writeFileSync(path.join(DIR, `${name}.js`), nekoCmd(name, cfg));
}
for (const [name, prompt] of Object.entries(characterPics)) {
  fs.writeFileSync(path.join(DIR, `${name}.js`), characterCmd(name, prompt));
}
for (const [name, prompt] of Object.entries(photoPics)) {
  fs.writeFileSync(path.join(DIR, `${name}.js`), characterCmd(name, prompt));
}
for (const [name, cfg] of Object.entries(reactCats)) {
  fs.writeFileSync(path.join(DIR, `${name}.js`), reactCmd(name, cfg));
}
for (const [name, src] of Object.entries(funCmds)) {
  fs.writeFileSync(path.join(DIR, `${name}.js`), src);
}
console.log('Families generated OK');
