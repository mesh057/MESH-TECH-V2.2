'use strict';

const pairingManager = require('../utils/pairingManager');

module.exports = {
  name: 'pair',
  description: 'Generate a session for a number (owner only). Usage: .pair 254754574642',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!msg.key.fromMe) {
      return sock.sendMessage(jid, { text: '❌ Only the owner can use this command.' }, { quoted: msg });
    }

    const number = (args[0] || '').replace(/[^0-9]/g, '');

    if (!number) {
      return sock.sendMessage(jid, { text: '❌ Usage: .pair 254754574642 (your number, country code, no +)' }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { text: `⏳ Preparing a pairing code for +${number}...` }, { quoted: msg });

      const session = await pairingManager.startPairing(number);
      const accessToken = session.accessToken;
      
      // Poll for the code
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const currentSession = pairingManager.getStatus(number, accessToken);
        
        if (!currentSession || attempts > 30) {
          clearInterval(interval);
          if (!currentSession?.sessionId) {
            await sock.sendMessage(jid, { text: '❌ Pairing timed out or failed.' }, { quoted: msg });
          }
          return;
        }

        if (currentSession.status === 'awaiting_code' && currentSession.code) {
          clearInterval(interval);
          await sock.sendMessage(jid, { text: `\`${currentSession.code}\`` });
          await sock.sendMessage(
            jid,
            { text: `🔐 Enter the code above in WhatsApp on +${number} → Linked Devices → Link with phone number. You have 3 minutes.` },
            { quoted: msg }
          );

          // Now poll for success
          let successAttempts = 0;
          const successInterval = setInterval(async () => {
            successAttempts++;
            const successSession = pairingManager.getStatus(number, accessToken);
            
            if (!successSession || successAttempts > 90) {
              clearInterval(successInterval);
              return;
            }

            if (successSession.status === 'success' && successSession.sessionId) {
              clearInterval(successInterval);
              await sock.sendMessage(
                jid,
                {
                  text: `✅ *Linked successfully!*\n\n🔐 *Your SESSION_ID:*\nSave this somewhere safe — treat it like a password. Paste it into your own deployment's SESSION_ID environment variable.\n\n${successSession.sessionId}`,
                },
                { quoted: msg }
              );
            }
          }, 2000);
        } else if (currentSession.status === 'error') {
          clearInterval(interval);
          await sock.sendMessage(jid, { text: `❌ Error: ${currentSession.error}` }, { quoted: msg });
        }
      }, 2000);

    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not start pairing: ' + e.message }, { quoted: msg });
    }
  }
};
