'use strict';

const config = require('../config/config');

const toBold = (text) => {
  const boldChars = {
    'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
    'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝘀', 'T': '𝘁', 'U': '𝘂', 'V': '𝘃', 'W': '𝘄', 'X': '𝗑', 'Y': '𝘆', 'Z': '𝘇',
    '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
  };
  return text.split('').map(c => boldChars[c] || c).join('');
};

const MARKERS = ['➊', '➋', '➌', '➍', '➎', '➏', '➐', '➑', '➒', '➓'];

function numberedLine(index, command) {
    return `║${MARKERS[index] || `${index + 1}.`} ⟿ .${command}`;
}

// Global session tracker for help pagination
if (!global.helpSessions) global.helpSessions = new Map();

module.exports = {
  name: 'help',
  aliases: ['h'],
  description: 'Interactive paginated help menu.',

  async execute(sock, msg, args, resources) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const commands = resources.commands;
    const prefix = config.prefix || '.';

    // 1. Get Unique Commands
    const uniqueCommands = [...new Map(
      [...commands.values()].map(cmd => [cmd.name.toLowerCase(), cmd])
    ).values()].sort((a, b) => a.name.localeCompare(b.name));

    // 2. Define Categories
    const categories = {
      "👑 OWNER": ["owner", "self", "public", "restart", "shutdown", "block", "unblock", "addsudo", "delsudo", "clearsudos", "checksudo", "eval", "shell", "system"],
      "👥 GROUP": ["kick", "add", "promote", "demote", "tagall", "hidetag", "open", "close", "groupinfo", "groupmembers", "groupstatus", "grouputils", "leavegroup", "mute", "unmute", "warn", "approve", "reject", "revoke"],
      "📥 DOWNLOAD": ["song", "video", "play", "ytmp3", "ytmp4", "tiktok", "insta", "fb", "gitclone", "img", "apk", "pindl", "socialdl", "download", "igstory"],
      "⚡ AI": ["ai", "ai2", "claude", "gptdm", "imagine", "vision", "vision2", "wormgpt", "lydia", "chatgpt", "grok", "mistral", "casperai", "bible", "quran"],
      "🪼 AUTO": ["anticall", "antidelete", "antiedit", "antilinkall", "antitag", "autobio", "autolike", "autoreact", "autoreactstatus", "autoread", "autorecording", "autoreply", "autotyping", "autoview", "wapresence", "alwaysonline"],
      "🎨 TOOLS": ["calc", "captions", "carbon", "cartoon", "compile", "define", "enc", "fancy", "fetch", "getcmd", "getfile", "getpfp", "ison", "jsj", "lyrics", "ocr", "qr", "quote", "remini", "removebg", "runtime", "sticker", "toimg", "tovideo", "trt", "tts", "upload", "uptime", "url", "vcf", "viewonce", "vv", "zip", "fire", "logo", "glass", "balloon", "glow", "enlarger", "colorize", "tempmail", "shorten", "ss"],
      "🎮 FUN": ["animal", "cat", "dog", "eightball", "fact", "game", "games", "hacker", "harami", "heart", "joke", "kill", "love", "meme", "mix", "nice", "roast", "tictactoe", "trivia", "truthordare"],
      "🎌 ANIME": ["akira", "akiyama", "anime", "asuna", "ayuzawa", "baka", "bite", "blush", "boruto", "bts", "chiho", "chitoge", "cosplay", "cry", "cuddle", "deidara", "doraemon", "elaina", "emilia", "erza", "exo", "hestia", "hinata", "hug", "husbu", "itachi", "itori", "jibril", "kiss", "kitsune", "kurumi", "luffy", "megumin", "mikasa", "neko", "nezuko", "pat", "rem", "rose", "shinobu", "slap", "smile", "waifu", "yumeko", "zerotwo"],
      "⚽ SPORTS": ["bundesliga", "epl", "euro", "fifa", "football", "laliga", "ligue1", "livescore", "seriea", "standings"]
    };

    // 3. Build Pages
    const pages = [];

    // Page 0: How to Use
    pages.push(`╭━━━〔 ${toBold("MESH-TECH V2.2 - START GUIDE")} 〕━━━┈⊷
┃ 👋 *Welcome to the V2.2 Interactive Help!*
┃ 
┃ 📖 *How to use:*
┃ 1. Use prefix [ *${prefix}* ] before any command.
┃ 2. Example: *${prefix}menu* or *${prefix}help*
┃ 3. For specific pages, type *${prefix}help [number]*
┃ 
┃ 🎮 *Navigation:*
┃ • React with ⬅️ for Previous Page.
┃ • React with ➡️ for Next Page.
┃ 
┃ 🚀 *Flip to Page 1 to see the Index!*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷`);

    // Page 1: Index
    let indexText = `╭━━━〔 ${toBold("MESH-TECH V2.2 - HELP INDEX")} 〕━━━┈⊷\n`;
    indexText += `┃ 📄 Page 0: How to Use\n`;
    indexText += `┃ 📑 Page 1: Help Index\n`;
    let pIdx = 2;
    for (const cat in categories) {
      indexText += `┃ ${cat.split(' ')[0]} Page ${pIdx}: ${cat}\n`;
      pIdx++;
    }
    indexText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷`;
    pages.push(indexText);

    // Dynamic Pages for Categories
    for (const [catName, cmdList] of Object.entries(categories)) {
      let catText = `╔═❖•⊰ ${catName} MENU ⊱•❖═╗\n`;
      const filtered = uniqueCommands.filter(c => 
        cmdList.some(keyword => c.name.toLowerCase().includes(keyword))
      );
      
      if (filtered.length === 0) {
        catText += `║⋄ No commands found.\n`;
      } else {
        filtered.forEach((c, index) => {
          catText += `${numberedLine(index, c.name)}\n`;
        });
      }
      catText += `╚════════════════════╝`;
      pages.push(catText);
    }

    // 4. Send Message
    let pageNum = 0;
    if (args && args[0]) {
      const parsed = parseInt(args[0]);
      if (!isNaN(parsed) && parsed >= 0 && parsed < pages.length) pageNum = parsed;
    }

    const content = pages[pageNum];
    const footer = `\n📌 *Page ${pageNum} of ${pages.length - 1}* | React ⬅️ or ➡️ to flip.`;
    
    const sentMsg = await sock.sendMessage(jid, { text: content + footer }, { quoted: msg });
    
    if (sentMsg?.key?.id) {
      global.helpSessions.set(sentMsg.key.id, {
        pageNum,
        pages,
        jid,
        author: sender
      });

      try {
        await sock.sendMessage(jid, { react: { text: '⬅️', key: sentMsg.key } });
        await sock.sendMessage(jid, { react: { text: '➡️', key: sentMsg.key } });
      } catch (e) {}
    }
  },

  async handleHelpReaction(sock, reaction, resources) {
    const { key, text: emoji } = reaction;
    if (!key?.id || !global.helpSessions.has(key.id)) return;

    const session = global.helpSessions.get(key.id);
    if (emoji !== '⬅️' && emoji !== '➡️') return;

    let newPage = session.pageNum;
    if (emoji === '➡️') {
      newPage = newPage >= session.pages.length - 1 ? 0 : newPage + 1;
    } else if (emoji === '⬅️') {
      newPage = newPage <= 0 ? session.pages.length - 1 : newPage - 1;
    }

    session.pageNum = newPage;
    global.helpSessions.set(key.id, session);

    const content = session.pages[newPage];
    const footer = `\n📌 *Page ${newPage} of ${session.pages.length - 1}* | React ⬅️ or ➡️ to flip.`;

    await sock.sendMessage(session.jid, {
      edit: key,
      text: content + footer
    });
  }
};
