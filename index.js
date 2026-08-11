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
const { acquireLock } = require('./utils/instanceLock');
const BotInstance = require('./lib/BotInstance');
const SettingsStore = require('./utils/settingsStore');
const GroupSettingsStore = require('./utils/groupSettingsStore');

// Prevent two instances running at the same time
acquireLock();

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
  printBanner();
  await fetchCore();

  const authDir = path.join(__dirname, config.authFolder);
  const dataDir = path.join(authDir, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // Initialize main bot instance
  // The main bot uses the default authFolder (auth_info_baileys)
  const mainBot = new BotInstance('main', authDir);
  global.meshMainBot = mainBot;
  
  // Set global main settings for backward compatibility in non-command contexts
  global.mainSettings = mainBot.settings;
  global.mainGroupSettings = mainBot.groupSettings;

  await mainBot.init();

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
