/**
 * textfx.js — exports several text-effect commands:
 * fancy, fliptext, smallcaps, strike, bubble, reverse, shapar, tte, readmore, cpp, hack, matrix, mirror
 */
'use strict';

/* ---------- fancy fonts ---------- */
const fancyFonts = {
  bold: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
  italic: '𝘈𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧',
  monospace: '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
  doublestruck: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
  fraktur: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
  smallcaps: 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ',
  bubble: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
  square: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉',
  circled: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
  strike: '\u0041\u0336\u0042\u0336\u0043\u0336\u0044\u0336\u0045\u0336\u0046\u0336\u0047\u0336\u0048\u0336\u0049\u0336\u004A\u0336\u004B\u0336\u004C\u0336\u004D\u0336\u004E\u0336\u004F\u0336\u0050\u0336\u0051\u0336\u0052\u0336\u0053\u0336\u0054\u0336\u0055\u0336\u0056\u0336\u0057\u0336\u0058\u0336\u0059\u0336\u005A\u0336\u0061\u0336\u0062\u0336\u0063\u0336\u0064\u0336\u0065\u0336\u0066\u0336\u0067\u0336\u0068\u0336\u0069\u0336\u006A\u0336\u006B\u0336\u006C\u0336\u006D\u0336\u006E\u0336\u006F\u0336\u0070\u0336\u0071\u0336\u0072\u0336\u0073\u0336\u0074\u0336\u0075\u0336\u0076\u0336\u0077\u0336\u0078\u0336\u0079\u0336\u007A\u0336',
  script: '𝒜𝐵𝒞𝒟𝐸𝐹𝒢𝐻𝐼𝒥𝒦𝐿𝑀𝒩𝒪𝒫𝒬𝑅𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
};
const PLAIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function fancy(text, style) {
  const map = fancyFonts[style] || fancyFonts.bold;
  return [...text].map(ch => {
    const i = PLAIN.indexOf(ch);
    return i >= 0 ? [...map][i] : ch;
  }).join('');
}

/* ---------- misc transforms ---------- */
function fliptext(text) {
  const flipMap = { 'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ', 'i': 'ᴉ', 'j': 'ɾ', 'k': 'ʞ', 'l': 'l', 'm': 'ɯ', 'n': 'u', 'o': 'o', 'p': 'd', 'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ', 'u': 'n', 'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z', 'A': '∀', 'B': 'q', 'C': 'Ɔ', 'D': 'p', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': 'פ', 'H': 'H', 'I': 'I', 'J': 'ſ', 'K': 'ʞ', 'L': '˥', 'M': 'W', 'N': 'N', 'O': 'O', 'P': 'd', 'Q': 'b', 'R': 'ɹ', 'S': 'S', 'T': '┴', 'U': '∩', 'V': 'Λ', 'W': 'M', 'X': 'X', 'Y': '⅄', 'Z': 'Z', '.': '˙', ',': '\'', '?': '¿', '!': '¡', '[': ']', ']': '[', '(': ')', ')': '(', '<': '>', '>': '<', '_': '‾' };
  return [...text].map(ch => flipMap[ch] || ch).reverse().join('');
}

function toSmallCaps(text) {
  return [...text].map(ch => fancyFonts.smallcaps[[...PLAIN].indexOf(ch)] ?? ch).join('');
}

function strike(text) {
  return [...text].map(ch => `${ch}\u0336`).join('');
}

function bubble(text) {
  return [...text].map(ch => {
    const i = [...PLAIN].indexOf(ch);
    return i >= 0 ? [...fancyFonts.bubble][i] : ch;
  }).join('');
}

function reverse(text) {
  return [...text].reverse().join('');
}

function zalgo(text, level = 3) {
  const up = ['\u030d', '\u030e', '\u0304', '\u0305', '\u033f', '\u0311', '\u0306', '\u0310', '\u0352', '\u0357', '\u0351', '\u0307', '\u0308', '\u030a', '\u0342', '\u0343', '\u0344', '\u034a', '\u034b', '\u034c', '\u0303', '\u0302', '\u030c', '\u0350', '\u0300', '\u0301', '\u030b', '\u030f', '\u0312', '\u0313', '\u0314', '\u033d', '\u0309', '\u0363', '\u0364', '\u0365', '\u0366', '\u0367', '\u0368', '\u0369', '\u036a', '\u036b', '\u036c', '\u036d', '\u036e', '\u036f', '\u0349', '\u034d', '\u0353', '\u035c', '\u035b', '\u0358', '\u035e', '\u034f', '\u0359', '\u035a', '\u0324'];
  const down = ['\u0316', '\u0317', '\u0318', '\u0319', '\u031c', '\u031d', '\u031e', '\u031f', '\u0320', '\u0324', '\u0325', '\u0326', '\u0329', '\u032a', '\u032b', '\u032c', '\u032d', '\u032e', '\u032f', '\u0330', '\u0331', '\u0332', '\u0333', '\u0339', '\u033a', '\u033b', '\u033c', '\u0345', '\u0347', '\u0348', '\u0341', '\u034e', '\u0354', '\u0355', '\u0356', '\u035d'];
  return [...text].map(ch => {
    let out = ch;
    for (let i = 0; i < level; i++) out += up[Math.floor(Math.random() * up.length)];
    for (let i = 0; i < level; i++) out += down[Math.floor(Math.random() * down.length)];
    return out;
  }).join('');
}

function sendText(sock, jid, msg, title, body) {
  return sock.sendMessage(jid, { text: `✏ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *${title}*\n\n${body}` }, { quoted: msg });
}

function makeTransformCmd(name, title, transform, note = 'Converts text to a style.', category = 'TEXT') {
  return {
    name,
    description: `${note} Usage: .${name} your text`,
    category,
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const text = args.join(' ');
      if (!text) {
        return await sock.sendMessage(jid, { text: `❌ Please provide text. Usage: \`.${name} your text\`` }, { quoted: msg });
      }
      try {
        await sendText(sock, jid, msg, title, transform(text));
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ Error: ${err.message}` }, { quoted: msg });
      }
    },
  };
}

const cmdList = [];
/* Readmore: splits text at ^ with WA read-more marker */
const ZERO_WIDTH = String.fromCharCode(8206);
cmdList.push({
  name: 'readmore',
  description: 'Split text with WA read-more marker. Usage: .readmore before^after',
  category: 'TEXT',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const text = args.join(' ');
    if (!text.includes('^')) {
      return await sock.sendMessage(jid, { text: '❌ Use "^" to mark where text should be hidden. Usage: `.readmore visible^hidden`' }, { quoted: msg });
    }
    const [before, ...rest] = text.split('^');
    const after = rest.join('^');
    await sock.sendMessage(jid, { text: `${before}${ZERO_WIDTH.repeat(2001)}${after}` }, { quoted: msg });
  },
});

cmdList.push({
  name: 'fancy',
  description: 'Convert text to a fancy font. Usage: .fancy <style> your text. Styles: bold, italic, mono, double, fraktur, smallcaps, bubble, square, circle, strike, script',
  category: 'TEXT',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (args.length < 2) {
      return await sock.sendMessage(jid, { text: '❌ Usage: `.fancy <style> your text`\nStyles: bold, italic, mono, double, fraktur, smallcaps, bubble, square, circle, strike, script' }, { quoted: msg });
    }
    const style = args[0].toLowerCase();
    const text = args.slice(1).join(' ');
    if (!fancyFonts[style]) {
      return await sock.sendMessage(jid, { text: `❌ Unknown style "${style}". Available: ${Object.keys(fancyFonts).join(', ')}` }, { quoted: msg });
    }
    await sendText(sock, jid, msg, 'FANCY', fancy(text, style));
  },
});  // fancy

cmdList.push(makeTransformCmd('fliptext', 'FLIPTEXT', fliptext));
cmdList.push(makeTransformCmd('smallcaps', 'SMALLCAPS', toSmallCaps));
cmdList.push(makeTransformCmd('strike', 'STRIKE', strike));
cmdList.push(makeTransformCmd('bubble', 'BUBBLE', bubble));
cmdList.push(makeTransformCmd('reverse', 'REVERSE', reverse));
cmdList.push(makeTransformCmd('zalgo', 'ZALGO', (t) => zalgo(t, 3)));
cmdList.push(makeTransformCmd('zalgo2', 'ZALGO2', (t) => zalgo(t, 7)));
cmdList.push(makeTransformCmd('tte', 'TTE (TEXT TO EMOJI)', (t) => {
  // map common words to emojis
  const map = { love: '❤️', heart: '❤️', fire: '🔥', cat: '🐱', dog: '🐶', star: '⭐', moon: '🌙', sun: '☀️', smile: '😊', sad: '😢', happy: '😄', cool: '😎', money: '💰', crown: '👑', skull: '💀', ghost: '👻', bomb: '💣', sword: '⚔️', shield: '🛡️', magic: '🪄', music: '🎵', rocket: '🚀', house: '🏠', car: '🚗', phone: '📱', game: '🎮', ball: '⚽', kiss: '💋', hi: '👋', bye: '👋', yes: '✅', no: '❌', ok: '👌', win: '🏆', king: '🤴', queen: '👸', devil: '😈', angel: '😇', eyes: '👀', brain: '🧠', rainbow: '🌈', tree: '🌳', flower: '🌸', water: '💧', lightning: '⚡', snow: '❄️', cloud: '☁️', rain: '🌧️', ninja: '🥷', robot: '🤖', alien: '👽', unicorn: '🦄', dragon: '🐉', snake: '🐍', lion: '🦁', wolf: '🐺', fox: '🦊', bear: '🐻', rabbit: '🐰', chicken: '🐔', pig: '🐷', cow: '🐮', fish: '🐟', whale: '🐳', octopus: '🐙', butterfly: '🦋', bee: '🐝', spider: '🕷️', pizza: '🍕', burger: '🍔', fries: '🍟', cake: '🎂', candy: '🍬', coffee: '☕', beer: '🍺', juice: '🧃', apple: '🍎', banana: '🍌', grape: '🍇', orange: '🍊', strawberry: '🍓', cherry: '🍒', peach: '🍑', lemon: '🍋', carrot: '🥕', broccoli: '🥦', corn: '🌽', pepper: '🌶️', egg: '🥚', bread: '🍞', cheese: '🧀', meat: '🍖', popcorn: '🍿', beer2: '🍻', soccer: '⚽', basketball: '🏀', football: '🏈', baseball: '⚾', tennis: '🎾', bowling: '🎳', golf: '⛳', fishing: '🎣', boxing: '🥊', dice: '🎲', puzzle: '🧩', art: '🎨', clapper: '🎬', mic: '🎤', guitar: '🎸', piano: '🎹', drum: '🥁', film: '🎞️', tv: '📺', camera: '📷', video: '📹', cd: '💿', book: '📖', pencil: '✏️', pen: '🖊️', paint: '🖌️', trophy: '🏆', medal: '🏅', flag: '🚩', map: '🗺️', compass: '🧭', anchor: '⚓', key: '🔑', lock: '🔒', clock: '🕐', watch: '⌚', hourglass: '⏳', bell: '🔔', light: '💡', candle: '🕯️', book2: '📕', phone2: '📞', mail: '✉️', inbox: '📥', box: '📦', folder: '📁', file: '📄', pencil2: '✍️', notebook: '📓', calendar: '📅', card: '💳', money2: '💵', gem: '💎', ring: '💍', present: '🎁', heart2: '💝', sparkles: '✨', confetti: '🎊', balloon: '🎈', party: '🥳', kiss2: '😘', wink: '😉', tongue: '😛', shocked: '😱', thinking: '🤔', sleeping: '😴', sick: '🤒', strong: '💪', point: '👉', clap: '👏', pray: '🙏', muscle: '💪', brain2: '🧠', heart3: '❤️' };
  return [...t.toLowerCase().match(/\b[a-z]+\b/g) || []].map(w => map[w] || w).join(' ');
}));  // tte

/* ---------- shapar: fake "she has appeared" joke cmd (popular in WA bots) ---------- */
cmdList.push({
  name: 'shapar',
  description: 'Fake notification prank: "She/He has appeared". Usage: .shapar <number>',
  category: 'TEXT',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = args[0] ? `${args[0]}@s.whatsapp.net` : msg.mentionedJid?.[0] || msg.key.participant;
    await sock.sendMessage(jid, { text: `☣ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *SHAPAR*\n\n⚠️ ɴᴏᴛɪꜰɪᴄᴀᴛɪᴏɴ\n\nShe appeared in @${target.split('@')[0]} last seen\n\n*ᴄᴀᴘᴛᴜʀᴇ ɪᴛ ɪꜰ ʏᴏᴜ ᴄᴀɴ*`, mentions: [target] }, { quoted: msg });
  },
});  // shapar

/* ---------- cpp: random programming snippet ---------- */
const snippets = [
  { title: 'C++ Hello World', code: '#include <iostream>\nint main() {\n  std::cout << "Hello World!";\n  return 0;\n}' },
  { title: 'C++ Reverse String', code: '#include <algorithm>\n#include <string>\nint main() {\n  std::string s = "MESH";\n  std::reverse(s.begin(), s.end());\n  return 0;\n}' },
  { title: 'C++ Fibonacci', code: '#include <iostream>\nint main() {\n  int a = 0, b = 1;\n  for (int i = 0; i < 10; ++i) {\n    std::cout << a << " ";\n    int t = a + b; a = b; b = t;\n  }\n  return 0;\n}' },
];
cmdList.push({
  name: 'cpp',
  description: 'Get a random C++ code snippet.',
  category: 'TEXT',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const s = snippets[Math.floor(Math.random() * snippets.length)];
    await sock.sendMessage(jid, { text: `☣ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *CPP*\n\n📌 ${s.title}\n\`\`\`\n${s.code}\n\`\`\`` }, { quoted: msg });
  },
});  // cpp

/* ---------- hack: fake hacker simulation ---------- */
cmdList.push({
  name: 'hack',
  description: 'Fake hacking simulation prank.',
  category: 'TOOLS',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = args[0] ? `${args[0].replace(/@s\.whatsapp\.net$/, '')}@s.whatsapp.net` : msg.mentionedJid?.[0] || msg.key.participant;
    const num = target.split('@')[0];
    const lines = [
      `☣ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *HACK*\n\n⏳ Connecting to @${num}...`,
      `✅ Connected!\n📡 Injecting payload...\n🔓 Bypassing firewall...`,
      `🧠 Accessing device memory...\n📂 Found 4,281 contacts\n📸 Found 1,092 photos`,
      `📲 Stealing WhatsApp chats...\n💳 Reading card details...`,
      `⚠️ Device compromised!\n🔥 All data sent to MESH-TECH servers.\n\n😈 Hack complete on @${num}`,
    ];
    for (const line of lines) {
      await sock.sendMessage(jid, { text: line, mentions: [target] }, { quoted: msg });
      await new Promise(r => setTimeout(r, 2500));
    }
  },
});  // hack

/* ---------- matrix: matrix rain text art ---------- */
cmdList.push({
  name: 'matrix',
  description: 'Show Matrix-style falling code art.',
  category: 'TOOLS',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const chars = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789';
    let art = '☣ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *MATRIX*\n\n';
    for (let i = 0; i < 14; i++) {
      let row = '';
      for (let j = 0; j < 20; j++) row += chars[Math.floor(Math.random() * chars.length)];
      art += `${row}\n`;
    }
    art += '\n🖥️ Wake up, Neo...';
    await sock.sendMessage(jid, { text: art }, { quoted: msg });
  },
});  // matrix

/* ---------- mirror: mirror the replied image (flip horizontally) ---------- */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const ffmpegPath = process.env.FFMPEG_PATH || require('ffmpeg-static') || 'ffmpeg';
cmdList.push({
  name: 'mirror',
  description: 'Mirror (flip horizontally) a replied image/video. Usage: reply to media with .mirror',
  category: 'TEXT',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;
    const isMedia = msg.message?.imageMessage || msg.message?.videoMessage;
    const isQuotedMedia = quoted?.imageMessage || quoted?.videoMessage;
    if (!isMedia && !isQuotedMedia) {
      return await sock.sendMessage(jid, { text: '❌ Reply to an image or video with .mirror' }, { quoted: msg });
    }
    const target = isMedia ? msg : { key: { remoteJid: jid }, message: quoted };
    const inputPath = path.join(os.tmpdir(), `mirror_in_${Date.now()}`);
    const outputPath = `${inputPath}_out.mp4`;
    try {
      await fs.promises.writeFile(inputPath, await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage }));
      const isVideo = Boolean(quoted?.videoMessage || msg.message?.videoMessage);
      const vfilter = isVideo ? '' : '-loop 1 -t 5';
      exec(`"${ffmpegPath}" ${vfilter} -i "${inputPath}" -vf "hflip" -c:v libx264 -pix_fmt yuv420p -an "${outputPath}"`, async (err) => {
        try {
          if (err) throw new Error('ffmpeg failed');
          await sock.sendMessage(jid, { video: { url: outputPath }, gifPlayback: false, caption: '✏ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *MIRROR*' }, { quoted: msg });
        } catch (e) {
          await sock.sendMessage(jid, { text: `❌ Mirror failed: ${e.message}` }, { quoted: msg });
        } finally {
          fs.promises.unlink(inputPath).catch(() => {});
          fs.promises.unlink(outputPath).catch(() => {});
        }
      });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Mirror failed: ${err.message}` }, { quoted: msg });
    }
  },
});  // mirror

module.exports = cmdList;
