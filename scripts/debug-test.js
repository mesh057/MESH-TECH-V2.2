'use strict';
const path = require('path');
const { loadCommands } = require('../utils/commandLoader');
const commands = loadCommands(path.join(__dirname, '..', 'commands'));
const unique = new Map();
for (const command of commands.values()) {
  unique.set(command.name.toLowerCase(), command);
}
const requiredControls = ['enable', 'disable', 'commandstatus'];
const missingControls = requiredControls.filter((n) => !commands.has(n));
const placeholderNames = ['autostatus', 'automationhelp', 'utilityhelp', 'grouphelp']
  .filter((n) => commands.has(n));
console.log(JSON.stringify({
  loadedEntries: commands.size,
  uniqueCommands: unique.size,
  missingControls,
  placeholderNames,
}));
