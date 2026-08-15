'use strict';

// Keep the menu text visible and searchable; do not hide commands with zero-width padding.
const READ_MORE = '';
const config = require('../config/config');

function getDateTime(timezone = 'Africa/Nairobi') {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(now).toUpperCase();
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(now);
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', hour12: false,
  }).format(now));
  let greeting = '🌙 Good Night';
  if (hour >= 5 && hour < 12) greeting = '🌅 Good Morning';
  else if (hour >= 12 && hour < 17) greeting = '☀️ Good Afternoon';
  else if (hour >= 17 && hour < 21) greeting = '🌆 Good Evening';
  return { date, time, greeting };
}

function getStatusBox(timezone = 'Africa/Nairobi', userCount = 0, commandCount = 0, connectedBotCount = 1) {
  const { date, time, greeting } = getDateTime(timezone);
  const uptimeSec = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = uptimeSec % 60;
  const ownerNumber = String(config.ownerNumber || '254746844168').replace(/\D/g, '');
  const randomRam = Math.floor(Math.random() * (95 - 55 + 1)) + 55;

  return `
╭━━━ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛 𝗠𝗗 𝗕𝗢𝗧* ━━━╮
┃ ${greeting}
┃ 🔥 𝗠𝗼𝗱𝗲: ${String(global.mode || 'public').toUpperCase()}|FULL POWER
┃ 💀 𝗣𝗿𝗼𝘁𝗼𝗰𝗼𝗹: PHANTOM CORE
┃ 👑 𝗢𝘄𝗻𝗲𝗿: 𝕄𝔼𝕊ℍ
┃ 📞 𝗡𝘂𝗺𝗯𝗲𝗿: ${ownerNumber}
┃ ⚙️ 𝗩𝗲𝗿𝘀𝗶𝗼𝗻: v2.4 [RESTORED CORE]
┃ ⏳ 𝗨𝗽𝘁𝗶𝗺𝗲: ${hours}h ${minutes}m ${seconds}s
┃ 📅 𝗗𝗮𝘁𝗲: ${date}
┃ 🕒 𝗧𝗶𝗺𝗲: ${time}
┃ 📌 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀: ${commandCount} 𝗟𝗼𝗮𝗱𝗲𝗱
┃ 👥 𝗨𝘀𝗲𝗿𝘀: ${userCount} Active (𝗿𝗲𝗮𝗹-𝘁𝗶𝗺𝗲)
┃ 🤖 𝗕𝗼𝘁𝘀 𝗖𝗼𝗻𝗻𝗲𝗰𝘁𝗲𝗱: ${connectedBotCount} 𝗟𝗶𝘃𝗲
┃ 📱 𝗗𝗲𝘃𝗶𝗰𝗲: ANDROID-CORE
	┃ 🧠 RAM: ${randomRam}/128 GB
╰━━━━━━━━━━━━━━━━━━╯
`;
}

function uniqueCommands(commands) {
  const values = commands instanceof Map ? [...commands.values()] : [];
  const seen = new Set();
  return values.filter((command) => {
    if (!command?.name) return false;
    const name = String(command.name).toLowerCase();
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  }).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function commandGroups(commands) {
  const groups = new Map();
  for (const command of uniqueCommands(commands)) {
    const category = String(command.category || command.group || 'GENERAL').trim().toUpperCase();
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(command);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

const MARKERS = ['➊', '➋', '➌', '➍', '➎', '➏', '➐', '➑', '➒', '➓'];

function numberedLine(index, name) {
  return `║${MARKERS[index] || `${index + 1}.`} ⟿ ${name}`;
}

const CATEGORY_EMOJIS = {
  SYSTEM: '🌐', OWNER: '👑', GROUP: '👥', DOWNLOAD: '📥', AI: '⚡',
  GITHUB: '🐙', TOOLS: '🧰', TEXT: '✏️', UTILITY: '🔧', STATUS: '📊',
  PHOTO: '📷', REACT: '🪅', GAME: '🎮', FUN: '🎲', ANIME: '🎌',
  GENERAL: '✨', STALK: '🔍', MISC: '🧩', EDIT: '🎨', AUTO: '🪼',
  PROTECTION: '🛡️', SPORTS: '⚽'
};

function formatGroup(title, commands, prefix = '.') {
  const emoji = CATEGORY_EMOJIS[title] || '⚡';
  const lines = commands.map((command, index) => numberedLine(index, `${prefix}${String(command.name)}`));
  return `╔═❖•⊰ ${emoji} *${title} MENU* ⊱•❖═╗\n${lines.join('\n')}\n╚════════════════════╝`;
}

function getMenu(commands = new Map(), timezone = 'Africa/Nairobi', userCount = 0) {
  const groups = commandGroups(commands);
  const loaded = uniqueCommands(commands);
  const liveUserCount = userCount || 0;
  const connectedBotCount = 1; // Default for single instance display
  const prefix = String(config.prefix || '.');
  
  const sections = groups.length
    ? groups.map(([title, entries]) => formatGroup(title, entries, prefix)).join('\n\n')
    : formatGroup('COMMANDS', [{ name: 'No commands loaded' }], prefix);

  return `${getStatusBox(timezone, liveUserCount, loaded.length, connectedBotCount)}
╔═❖•⊰ *𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗠𝗘𝗡𝗨* ⊱•❖═╗
║୧⍤⃝💐 𝗔𝗹𝗹 𝗹𝗼𝗮𝗱𝗲𝗱 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝘀
╚═══════════════════╝
${READ_MORE}
${sections}

*『 𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛 𝗠𝗗 』*
`;
}

module.exports = { getMenu, getStatusBox, commandGroups, uniqueCommands };
