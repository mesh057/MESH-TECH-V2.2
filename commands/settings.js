const config = require('../config/config');

const SETTINGS_COMMANDS = [
  'hideviewchannel', 'anticall', 'events', 'settings', 'syncsettings',
  'devicemode', 'botname', 'author', 'packname', 'timezone', 'botpic',
  'menustyle', 'boturl', 'mode', 'prefix', 'presence', 'greet', 'chatbot',
  'autoviewstatus', 'autoreplystatus', 'autoreactstatus', 'autoread',
  'autoreact', 'autobio', 'antistatusmention', 'antilink', 'antidelete',
  'antiedit', 'viewonce', 'statusantidelete', 'allvar', 'getvar', 'setvar',
  'systeminfo', 'eval', 'exec', 'fetch', 'clearsession', 'shell', 'chunk',
  'save', 'vv2', 'vv', 'profile', 'fullpp', 'phone', 'jid', 'mygroups',
  'setsudo', 'delsudo', 'issudo', 'getsudo', 'deploy', 'subbots', 'stopbot',
  'test2', 'post', 'jidcount',
];

function buildSettingsMenu(prefix = '.') {
  const commandLines = SETTINGS_COMMANDS.map((name) => `• ${prefix}${name}`).join('\n');
  return `📋 *5. ⚙️ SETTINGS MENU*\n\n${commandLines}\n\n_Reply *0* to go back to main menu_\n\n▬▬▬▬▬▬▬▬▬▬\n*Deploy your bot now*\n> MESH-TECH MD\n> https://wa.me/254746844168\n▬▬▬▬▬▬▬▬▬▬`;
}

module.exports = {
  name: 'settings',
  description: "Shows the MESH-TECH settings command menu.",
  settingsCommands: SETTINGS_COMMANDS,
  buildSettingsMenu,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const prefix = String(config.prefix || '.');
    await sock.sendMessage(jid, { text: buildSettingsMenu(prefix) }, { quoted: msg });
  },
};
