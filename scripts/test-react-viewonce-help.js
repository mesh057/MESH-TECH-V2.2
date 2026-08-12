const assert = require('assert');
const autoreactstatus = require('../commands/autoreactstatus');
const viewonce = require('../commands/viewonce');

const reactHelp = autoreactstatus.buildHelp('.', false, ['💛', '❤️', '💜', '🤍', '💙']);
assert.match(reactHelp, /😍 Auto React Status/);
assert.match(reactHelp, /Enabled:\* ❌ OFF/);
assert.match(reactHelp, /\.autoreactstatus emojis 👍,❤️,🔥/);
assert.match(reactHelp, /random one will be picked/);

const viewHelp = viewonce.buildHelp('.');
assert.match(viewHelp, /👁️ \*ViewOnce Auto-Forward Settings\*/);
assert.match(viewHelp, /\.viewonce on all/);
assert.match(viewHelp, /\.viewonce off all/);
assert.match(viewHelp, /\.viewonce status/);
assert.match(viewHelp, /\.vv2/);

console.log('PASS: autoreactstatus and viewonce provide the requested user-facing help screens.');
