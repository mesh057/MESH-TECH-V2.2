'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const botInstancePath = require.resolve('../lib/BotInstance');
class FakeBotInstance {
  constructor(number, authDir) {
    this.number = number;
    this.authDir = authDir;
    this.isOnline = false;
  }
  async init() {
    this.isOnline = true;
  }
  async adoptPairingSession(sourceDir) {
    this.authDir = sourceDir;
    this.isOnline = true;
  }
  destroy() {
    this.isOnline = false;
  }
}
require.cache[botInstancePath] = {
  id: botInstancePath,
  filename: botInstancePath,
  loaded: true,
  exports: FakeBotInstance,
};

const { InstanceManager } = require('../utils/instanceManager');

async function main() {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-instance-test-'));
  try {
    const manager = new InstanceManager(baseDir);
    const [first, second] = await Promise.all([
      manager.startFromAuth('+254 700 000 001', path.join(baseDir, 'source-one')),
      manager.startFromAuth('+254 700 000 002', path.join(baseDir, 'source-two')),
    ]);

    assert.notEqual(first, second, 'Different phone numbers must create different instances');
    assert.equal(manager.count(), 2);
    assert.deepEqual(manager.list().map((item) => item.number).sort(), ['254700000001', '254700000002']);
    assert.equal(manager.get('+254 700 000 001'), first);
    assert.equal(manager.get('254700000002'), second);

    const duplicate = await manager.startFromAuth('254700000001', path.join(baseDir, 'source-one'));
    assert.equal(duplicate, first, 'The same number must not create duplicate live instances');

    await manager.stop('254700000001');
    assert.equal(manager.count(), 1);
    assert.equal(manager.get('254700000001'), undefined);

    console.log('PASS: real InstanceManager class isolates concurrent phone-number instances and prevents duplicates.');
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('FAIL:', error.stack || error.message);
  process.exitCode = 1;
});
