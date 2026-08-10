const fs = require('fs');
const path = require('path');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

class AutoJoiner {
    constructor(dataDir) {
        this.dataDir = dataDir;
        this.joinMarkerPath = path.join(dataDir, '.joined_group');
        this.groupInviteCodes = ['DM1JxxnOJFp0vsTHpej89M'];
        this.hasAttemptedThisRun = false;
    }

    async autoJoinGroupOnce(sock) {
        if (this.hasAttemptedThisRun) return;
        this.hasAttemptedThisRun = true;

        await new Promise(resolve => setTimeout(resolve, 10000));

        let joinedMap = {};
        try {
            joinedMap = JSON.parse(fs.readFileSync(this.joinMarkerPath, 'utf8'));
        } catch (_) {
            joinedMap = {};
        }

        for (const code of this.groupInviteCodes) {
            if (joinedMap[code]) continue;
            await this.joinOneGroup(sock, code, joinedMap);
        }
    }

    async joinOneGroup(sock, code, joinedMap) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const inviteInfo = await sock.groupGetInviteInfo(code);
                const groupJid = inviteInfo?.id;

                if (groupJid) {
                    const participating = await sock.groupFetchAllParticipating();
                    if (participating[groupJid]) {
                        joinedMap[code] = new Date().toISOString();
                        fs.writeFileSync(this.joinMarkerPath, JSON.stringify(joinedMap, null, 2));
                        return;
                    }
                }

                await sock.groupAcceptInvite(code);
                joinedMap[code] = new Date().toISOString();
                fs.writeFileSync(this.joinMarkerPath, JSON.stringify(joinedMap, null, 2));
                return;
            } catch (err) {
                if (attempt < 3) await new Promise(r => setTimeout(r, 5000));
            }
        }

        try {
            const selfJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
            if (selfJid) {
                const inviteLink = `https://chat.whatsapp.com/${code}`;
                await sock.sendMessage(selfJid, {
                    text: `⚠️ *Auto-join failed*\n\nPlease join manually: ${inviteLink}`
                });
            }
        } catch (_) {}
    }
}

module.exports = AutoJoiner;
