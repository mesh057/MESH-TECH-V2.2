const assert = require('assert');
const settings = require('../commands/settings');

const output = settings.buildSettingsMenu('.');

assert.match(output, /📋 \*5\. ⚙️ SETTINGS MENU\*/);
assert.match(output, /• \.hideviewchannel/);
assert.match(output, /• \.autoviewstatus/);
assert.match(output, /• \.autoreactstatus/);
assert.match(output, /• \.chatbot/);
assert.match(output, /• \.setvar/);
assert.match(output, /• \.jidcount/);
assert.match(output, /Reply \*0\* to go back to main menu/);
assert.match(output, /MESH-TECH MD/);
assert.match(output, /https:\/\/wa\.me\/254746844168/);
assert.doesNotMatch(output, /bwmxmd|Isaac/i);

console.log('PASS: dedicated settings menu contains the requested command list, navigation instruction, and MESH-TECH footer.');
