'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const AutoJoiner = require('../utils/autoJoin');

async function main() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-tech-autojoin-'));
    const tenantA = path.join(root, 'tenant-a');
    const tenantB = path.join(root, 'tenant-b');
    fs.mkdirSync(tenantA, { recursive: true });
    fs.mkdirSync(tenantB, { recursive: true });
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = (callback) => originalSetTimeout(callback, 0);
    try {
        const joinerA = new AutoJoiner(tenantA, 'https://chat.whatsapp.com/INVITE_A');
        const joinerB = new AutoJoiner(tenantB, 'INVITE_B');
        assert.deepStrictEqual(joinerA.groupInviteCodes, ['INVITE_A']);
        assert.deepStrictEqual(joinerB.groupInviteCodes, ['INVITE_B']);
        assert.notStrictEqual(joinerA.joinMarkerPath, joinerB.joinMarkerPath);
        let attemptsA = 0;
        const sockA = {
            user: { id: '254700000001:1@s.whatsapp.net' },
            async groupGetInviteInfo() { return { id: '120363000000001@g.us' }; },
            async groupFetchAllParticipating() { return {}; },
            async groupAcceptInvite() { attemptsA += 1; if (attemptsA === 1) throw new Error('temporary failure'); return '120363000000001@g.us'; },
            async sendMessage() { throw new Error('manual fallback should not be sent after recovery'); },
        };
        await joinerA.autoJoinGroupOnce(sockA);
        const markerA = JSON.parse(fs.readFileSync(joinerA.joinMarkerPath, 'utf8'));
        assert.ok(markerA.INVITE_A);
        assert.strictEqual(attemptsA, 2);
        await joinerA.autoJoinGroupOnce(sockA);
        assert.strictEqual(attemptsA, 2);
        assert.ok(!fs.existsSync(joinerB.joinMarkerPath));
        const callsB = [];
        const sockB = {
            user: { id: '254700000002:1@s.whatsapp.net' },
            async groupGetInviteInfo(code) { callsB.push(['info', code]); return null; },
            async groupAcceptInvite(code) { callsB.push(['accept', code]); return '120363000000002@g.us'; },
            async groupFetchAllParticipating() { return {}; },
        };
        await joinerB.autoJoinGroupOnce(sockB);
        const markerB = JSON.parse(fs.readFileSync(joinerB.joinMarkerPath, 'utf8'));
        assert.ok(markerB.INVITE_B);
        assert.deepStrictEqual(callsB, [['info', 'INVITE_B'], ['accept', 'INVITE_B']]);
        console.log('Auto-join regression tests passed.');
    } finally {
        global.setTimeout = originalSetTimeout;
        fs.rmSync(root, { recursive: true, force: true });
    }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
