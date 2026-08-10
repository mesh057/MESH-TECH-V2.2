'use strict';

const path = require('path');
const { loadCommands } = require('../utils/commandLoader');

const commands = loadCommands(path.join(__dirname, '..', 'commands'));
const unique = new Map();
for (const command of commands.values()) {
  unique.set(command.name.toLowerCase(), command);
}

const requiredControls = ['enable', 'disable', 'commandstatus'];
const missingControls = requiredControls.filter(name => !commands.has(name));
const placeholderNames = ['automationhelp', 'utilityhelp', 'grouphelp']
  .filter(name => commands.has(name));

if (missingControls.length || placeholderNames.length || unique.size === 0) {
  console.error(JSON.stringify({ missingControls, placeholderNames, uniqueCommands: unique.size }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  loadedEntries: commands.size,
  uniqueCommands: unique.size,
  aliases: commands.size - unique.size,
  requiredControls,
}, null, 2));
