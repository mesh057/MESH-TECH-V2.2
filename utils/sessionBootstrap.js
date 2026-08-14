'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Bootstraps a session directory from a Base64 encoded SESSION_ID string.
 * This allows the bot to recover its credentials on ephemeral hosts like Railway.
 */
async function bootstrapSession(sessionId, targetDir) {
    if (!sessionId || typeof sessionId !== 'string') return false;
    
    // Check if we already have credentials
    if (fs.existsSync(path.join(targetDir, 'creds.json'))) {
        return true;
    }

    try {
        // Clean prefix if present (e.g., MESH-TECH;;;)
        const base64Data = sessionId.includes(';;;') ? sessionId.split(';;;')[1] : sessionId;
        const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
        const creds = JSON.parse(jsonString);

        if (!creds || !creds.noiseKey) {
            throw new Error('Invalid SESSION_ID format.');
        }

        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, 'creds.json'), JSON.stringify(creds, null, 2));
        
        logger.info(`[Bootstrap] Successfully restored session to ${targetDir}`);
        return true;
    } catch (error) {
        logger.error(`[Bootstrap] Failed to restore session from SESSION_ID: ${error.message}`);
        return false;
    }
}

module.exports = { bootstrapSession };
