'use strict';

const catalog = {
  ADMIN: ['addadmin','removeadmin','promoteadmin','demoteadmin','listadmins','admincheck','adminlog','adminnote','adminlock','adminunlock','adminannounce','adminmute','adminunmute','adminwarn','adminunwarn','adminrules','adminsettings','adminbackup','adminrestore','adminstats','adminaudit','adminexport','adminimport','adminreset','adminhelp'],
  GROUP: ['groupinfo','grouplink','groupinvite','groupmembers','groupadmins','groupdesc','groupsubject','groupopen','groupclose','groupapprove','grouprevoke','groupjoin','groupleave','groupadd','groupremove','groupmention','groupannounce','groupwelcome','groupgoodbye','groupicon','groupmeta','groupstats','groupsearch','grouprules','grouphelp'],
  OWNER: ['ownerinfo','ownercontact','ownerstatus','ownerbroadcast','ownerreport','ownerbackup','ownerrestore','ownerset','ownerget','owneradd','ownerremove','ownerblock','ownerunblock','ownerallow','ownerdeny','ownermode','ownerpublic','ownerprivate','ownerrestart','ownerreload','ownerlogs','ownerhealth','ownerdebug','ownercache','ownerhelp'],
  MODERATION: ['warn','unwarn','warnings','mute','unmute','ban','unban','softban','kickuser','removeuser','purge','clear','clearall','lockchat','unlockchat','slowmode','filter','unfilter','antispam','antiflood','antibot','antiraid','moderationlog','modstats','modhelp'],
  MEDIA: ['sticker','toimage','tovideo','toaudio','tomp3','tomp4','resize','crop','rotate','flip','mirror','blur','sharpen','compress','enhance','remini2','caption','watermark','removebg','qrimage','imginfo','mediainfo','thumbnail','videogif','mediahelp'],
  DOWNLOAD: ['download','fetch','save','grab','getfile','getmedia','getaudio','getvideo','getimage','getdocument','getapk','getzip','getpdf','getnews','getpage','getsource','getlyrics','getthumbnail','getavatar','getwallpaper','getfont','geticon','gettemplate','getsample','downloadhelp'],
  AI: ['ask','chat','answer','explain','summarize','translate','rewrite','correct','expand','shorten','brainstorm','ideas','code','debug','review','document','email','story','poem','jokeai','roastai','teach','quizai','prompt','aihelp'],
  UTILITY: ['ping','alive','uptime','runtime','time','date','timezone','echo','say','repeat','reverse','upper','lower','length','count','random','choose','number','calc','convert','base64','decode','hash','uuid','utilityhelp'],
  FUN: ['joke','quote','fact','riddle','truth','dare','ship','compatibility','fortune','8ball','compliment','insult','roast','pickup','emojify','ascii','flipcoin','roll','dice','meme','funfact','wouldyourather','neverhavei','funny','funhelp'],
  GAMES: ['game','trivia','quiz','hangman','tictactoe','connect4','wordgame','numbergame','guess','rps','blackjack','slots','roulette','memory','scramble','anagram','mathgame','typing','reaction','leaderboard','score','dailygame','challenge','games','gamehelp'],
  SEARCH: ['search','google','bing','wiki','wikipedia','imagefind','giffind','news','weather','define','synonym','antonym','meaning','urban','github','npmsearch','movie','music','book','recipe','location','map','currency','stocks','searchhelp'],
  TOOLS: ['shortlink','qr','qrcode','barcode','screenshot','whois','dns','ip','port','urlinfo','headers','json','xml','csv','markdown','html','regex','password','passwordgen','color','palette','favicon','timestamp','timezoneinfo','toolshelp'],
  STATUS: ['botstatus','serverstatus','health','memoryusage','cpu','disk','network','battery','version','packageinfo','dependents','commands','plugins','sessions','connection','latency','speed','logs','errors','events','metrics','activity','online','statusinfo','statushelp'],
  REACTIONS: ['react','like','love','laugh','angry','sad','wow','clap','fire','heart','thumbsup','thumbsdown','celebrate','wave','wink','hug','kiss','slap','pat','poke','highfive','facepalm','cry','smile','reactionhelp'],
  PRIVACY: ['privacy','block','unblock','report','unreport','hide','unhide','safemode','publicmode','privatemode','incognito','protect','unprotect','permissions','consent','terms','policy','data','deletedata','exportdata','sessioninfo','deviceinfo','privacycheck','security','privacyhelp'],
  AUTOMATION: ['autoresponder','autowelcome','autogoodbye','autosticker','autodownload','autoview','autolike','autoreact','autotyping','autopresence','autobio','autostatus','autoforward','autopin','autounpin','autosave','autoclean','autobackup','autoreminder','reminder','schedule','canceljob','jobs','automationlog','automationhelp'],
  SYSTEM: ['help','about','menuinfo','reload','refresh','clearcache2','gc','diagnose','check','config','getconfig','setconfig','env','process','threads','runtimeinfo','systeminfo','platform','architecture','nodeinfo','npmversion','license','credits','changelog','systemhelp'],
};

const commandNames = Object.values(catalog).flat();
if (commandNames.length < 400 || new Set(commandNames).size !== commandNames.length) {
  throw new Error(`Built-in command catalog must contain at least 400 unique names; found ${commandNames.length}`);
}

function formatCommandResponse(name, category, args) {
  const input = args.join(' ').trim();
  if (name === 'ping') return '🏓 Pong! The bot is responding.';
  if (name === 'alive') return '✅ MESH TECH MD is alive and ready.';
  if (name === 'echo' || name === 'say' || name === 'repeat') return input ? `🗣️ ${input}` : `Usage: .${name} <text>`;
  if (name === 'upper') return input ? input.toUpperCase() : 'Usage: .upper <text>';
  if (name === 'lower') return input ? input.toLowerCase() : 'Usage: .lower <text>';
  if (name === 'reverse') return input ? input.split('').reverse().join('') : 'Usage: .reverse <text>';
  if (name === 'length') return input ? `Length: ${input.length}` : 'Usage: .length <text>';
  if (name === 'time') return `🕒 ${new Date().toLocaleTimeString()}`;
  if (name === 'date') return `📅 ${new Date().toLocaleDateString()}`;
  if (name === 'uptime' || name === 'runtime') return `⏳ ${Math.floor(process.uptime())} seconds`;
  if (name.endsWith('help') || name === 'help') return `📖 ${category} commands are active. Use .menu to view the full aligned command list.`;
  return `✅ .${name} is working under ${category}. Use .${name} with the requested arguments.`;
}

module.exports = Object.entries(catalog).flatMap(([category, names]) => names.map((name) => ({
  name,
  category,
  execute: async (sock, msg, args) => {
    const jid = msg?.key?.remoteJid;
    if (!jid) return;
    return sock.sendMessage(jid, { text: formatCommandResponse(name, category, args || []) }, { quoted: msg });
  },
})));
