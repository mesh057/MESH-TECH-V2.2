'use strict';

const config = require('../config/config');

const toBold = (text) => {
  const boldChars = {
    'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
    'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗺', 'N': '𝗻', 'O': '𝗼', 'P': '𝗽', 'Q': '𝗤', 'R': '𝗿', 'S': '𝘀', 'T': '𝘁', 'U': '𝘂', 'V': '𝘃', 'W': '𝘄', 'X': '𝗑', 'Y': '𝘆', 'Z': '𝘇',
    '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
  };
  return text.split('').map(c => boldChars[c] || c).join('');
};

const descriptions = {
  "owner": "Shows the bot owner's contact info.",
  "self": "Set bot to private mode.",
  "public": "Set bot to public mode.",
  "restart": "Restarts the bot process.",
  "shutdown": "Shuts down the bot process.",
  "block": "Blocks a user from using the bot.",
  "unblock": "Unblocks a user.",
  "kick": "Removes a member from the group.",
  "add": "Adds a participant to the group.",
  "promote": "Promotes a member to group admin.",
  "demote": "Demotes an admin to member.",
  "tagall": "Mentions all members in the group.",
  "hidetag": "Mentions all members without visible tags.",
  "open": "Opens the group for all members.",
  "close": "Closes the group for admins only.",
  "groupstatus": "Shows current group settings.",
  "song": "Download music from YouTube.",
  "video": "Download video from YouTube.",
  "play": "Search and play audio from YouTube.",
  "ytmp3": "Download YouTube audio via link.",
  "ytmp4": "Download YouTube video via link.",
  "tiktok": "Download TikTok video (no WM).",
  "insta": "Download Instagram Reels/Posts.",
  "fb": "Download Facebook videos.",
  "gitclone": "Clone a GitHub repository.",
  "img": "Search for images on Google.",
  "apk": "Download Android apps (APK).",
  "pindl": "Download Pinterest media.",
  "ai": "Chat with GPT-4 AI assistant.",
  "imagine": "Generate AI images from text.",
  "vision": "Analyze images using AI vision.",
  "wormgpt": "Chat with WormGPT (unfiltered).",
  "anticall": "Toggle automatically rejecting calls.",
  "antidelete": "Toggle message recovery.",
  "antilink": "Toggle group link protection.",
  "autoview": "Toggle viewing statuses.",
  "autoreact": "Toggle auto message reactions.",
  "autoreactstatus": "Toggle auto status reactions.",
  "alwaysonline": "Toggle always online mode.",
  "autotyping": "Toggle fake typing indicator.",
  "autorecording": "Toggle fake recording indicator.",
  "calc": "Perform math calculations.",
  "lyrics": "Search for song lyrics.",
  "ocr": "Extract text from an image.",
  "qr": "Generate or read QR codes.",
  "remini": "Enhance blurry images with AI.",
  "removebg": "Remove background from images.",
  "runtime": "Check bot runtime with rich card.",
  "sticker": "Convert image to sticker.",
  "toimg": "Convert sticker to image.",
  "tovideo": "Convert sticker/GIF to video.",
  "trt": "Translate text between languages.",
  "tts": "Convert text to speech audio.",
  "uptime": "Check bot uptime with audio.",
  "url": "Upload file and get a public link.",
  "fire": "Generate fire-style text logo.",
  "logo": "Generate gaming logo maker.",
  "tempmail": "Generate a temporary email.",
  "ss": "Take a screenshot of a website.",
  "tictactoe": "Play TicTacToe with friends.",
  "joke": "Get a random funny joke.",
  "fact": "Get a random interesting fact.",
  "waifu": "Get random waifu anime picture.",
  "seriea": "Show Italian Serie A standings.",
  "livescore": "Show live football scores."
};

if (!global.helpSessions) global.helpSessions = new Map();

module.exports = {
  name: 'help',
  aliases: ['h'],
  description: 'Interactive paginated help menu with descriptions.',

  async execute(sock, msg, args, resources) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const commands = resources.commands;
    const prefix = config.prefix || '.';

    const uniqueCommands = [...new Map(
      [...commands.values()].map(cmd => [cmd.name.toLowerCase(), cmd])
    ).values()].sort((a, b) => a.name.localeCompare(b.name));

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

    const pages = [];

    // Page 0: Start Guide
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

    // Category Pages
    for (const [catName, cmdList] of Object.entries(categories)) {
      let catText = `╔═❖•⊰ ${catName} MENU ⊱•❖═╗\n`;
      const filtered = uniqueCommands.filter(c => 
        cmdList.some(keyword => c.name.toLowerCase().includes(keyword))
      );
      
      if (filtered.length === 0) {
        catText += `║⋄ No commands found.\n`;
      } else {
        filtered.forEach((c) => {
          const desc = descriptions[c.name.toLowerCase()] || c.description || "No description available.";
          catText += `• ${prefix}${c.name} — ${desc}\n`;
        });
      }
      catText += `╚════════════════════╝`;
      pages.push(catText);
    }

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

  async handleHelpReaction(sock, reaction) {
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
