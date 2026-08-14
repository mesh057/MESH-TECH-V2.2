'use strict';

const pairingManager = require('../utils/pairingManager');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'pairqr',
  description: 'Generate a QR code for pairing a number (owner only). Usage: .pairqr 254754574642',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!msg.key.fromMe) {
      return sock.sendMessage(jid, { text: '❌ Only the owner can use this command.' }, { quoted: msg });
    }

    const number = (args[0] || '').replace(/[^0-9]/g, '');

    if (!number) {
      return sock.sendMessage(jid, { text: '❌ Usage: .pairqr 254754574642 (your number, country code, no +)' }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { text: `⏳ Generating a pairing QR code for +${number}...` }, { quoted: msg });

      const session = await pairingManager.startPairing(number, true); // true for useQr
      const accessToken = session.accessToken;
      
      // Poll for the QR
      let attempts = 0;
      let qrSent = false;
      
      const interval = setInterval(async () => {
        attempts++;
        const currentSession = pairingManager.getStatus(number, accessToken);
        
        if (!currentSession || attempts > 60) {
          clearInterval(interval);
          if (!qrSent && !currentSession?.sessionId) {
            await sock.sendMessage(jid, { text: '❌ QR Pairing timed out or failed.' }, { quoted: msg });
          }
          return;
        }

        if (currentSession.status === 'awaiting_qr' && currentSession.qr && !qrSent) {
          qrSent = true;
          
          try {
            const qrBuffer = await QRCode.toBuffer(currentSession.qr, { scale: 8 });
            const tempPath = path.join(__dirname, `../tmp/qr_${number}.png`);
            
            if (!fs.existsSync(path.join(__dirname, '../tmp'))) {
                fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
            }
            
            fs.writeFileSync(tempPath, qrBuffer);

            await sock.sendMessage(jid, { 
                image: { url: tempPath }, 
                caption: `📸 *SCAN THIS QR CODE*\n\n1. Open WhatsApp on +${number}\n2. Tap Menu or Settings → Linked Devices\n3. Tap *Link a Device*\n4. Point your camera at this QR code.\n\n⏳ Expiring in 2 minutes.` 
            }, { quoted: msg });

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
                    await sock.sendMessage(jid, { 
                        text: `✅ *Linked successfully!*\n\n🔐 *Your SESSION_ID:*\nSave this somewhere safe. Paste it into your deployment's SESSION_ID environment variable.\n\n${successSession.sessionId}` 
                    }, { quoted: msg });
                    
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                }
            }, 2000);

          } catch (qrErr) {
            clearInterval(interval);
            await sock.sendMessage(jid, { text: `❌ Failed to generate QR image: ${qrErr.message}` }, { quoted: msg });
          }
        } else if (currentSession.status === 'error') {
          clearInterval(interval);
          await sock.sendMessage(jid, { text: `❌ Error: ${currentSession.error}` }, { quoted: msg });
        }
      }, 2000);

    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not start QR pairing: ' + e.message }, { quoted: msg });
    }
  }
};
