'use strict';

// globalThis.crypto is built-in for Node.js v20+ and read-only in v24+
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const figlet = require('figlet');
const chalk = require('chalk');
const config = require('./config/config');
const logger = require('./utils/logger');
const { fetchCore } = require('./utils/fetchCore');
const { acquireLock, releaseLock } = require('./utils/instanceLock');
const instanceManager = require('./utils/instanceManager');
const { bootstrapSession } = require('./utils/sessionBootstrap');

function printBanner() {
  console.log(
    chalk.green(
      figlet.textSync('MESH-TECH-MD', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      })
    )
  );
  console.log(chalk.cyan('🤖 MESH-TECH-MD Multi-User Server is starting up...'));
}

async function start() {
  await acquireLock();
  printBanner();
  await fetchCore();

  // 1. Optional backward-compatible bootstrap session.
  // For multi-session deployments, SESSION_OWNER_NUMBER scopes this session
  // to its actual WhatsApp account instead of using the legacy "main" key.
  const mainSessionId = process.env.SESSION_ID;
  if (mainSessionId) {
    const bootstrapNumber = String(process.env.SESSION_OWNER_NUMBER || 'main').replace(/\D/g, '') || 'main';
    const mainAuthDir = path.join(__dirname, process.env.MULTI_USER_AUTH_DIR || 'auth_sessions', bootstrapNumber);
    await bootstrapSession(mainSessionId, mainAuthDir);
    if (!instanceManager.get(bootstrapNumber)) {
      await instanceManager.startFromAuth(bootstrapNumber, mainAuthDir);
    }
  }

  // 2. Start every persisted customer instance from its own auth/data directory.
  await instanceManager.startExisting();

  // 3. Keep the legacy auth folder compatible with existing deployments.
  const legacyAuthDir = path.join(__dirname, config.authFolder);
  if (fs.existsSync(path.join(legacyAuthDir, 'creds.json')) && !instanceManager.get('main')) {
    await instanceManager.startFromAuth('main', legacyAuthDir);
  }

  // Start the pairing server (already required in background via index.js or similar)
  // Actually, index.js is the entry point, so we need to make sure server.js is running.
  const { app } = require('./server'); 
  // server.js starts listening on its own when required if it has the listen call.
}

process.on('uncaughtException', (error) => {
  logger.error(`[uncaughtException] ${error.stack || error.message}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`[unhandledRejection] ${reason}`);
});

const startupDelay = parseInt(process.env.MESH_TECH_RESTART_DELAY_MS || '0', 10);
setTimeout(start, startupDelay);

// ✅ Graceful Shutdown for Railway / Docker
async function shutdown(signal) {
  console.log(`[System] Received ${signal}. Shutting down gracefully...`);
  try {
    await instanceManager.stopAll();
  } catch (e) {}
  releaseLock();
  console.log('[System] Shutdown complete.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
