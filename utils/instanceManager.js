'use strict';

const fs = require('fs');
const path = require('path');
const BotInstance = require('../lib/BotInstance');
const logger = require('./logger');

class InstanceManager {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.instances = new Map();
    this.maxInstances = Math.max(1, Number(process.env.MAX_BOT_INSTANCES || 25));
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  normalize(number) {
    return String(number || '').replace(/\D/g, '');
  }

  authDirFor(number) {
    const normalized = this.normalize(number);
    if (!normalized) throw new Error('A valid phone number is required.');
    return path.join(this.baseDir, normalized);
  }

  async startExisting() {
    const entries = fs.readdirSync(this.baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !/^\d{8,15}$/.test(entry.name)) continue;
      const authDir = path.join(this.baseDir, entry.name);
      if (!fs.existsSync(path.join(authDir, 'creds.json'))) continue;
      await this.startFromAuth(entry.name, authDir);
    }
  }

  async startFromAuth(number, authDir) {
    const normalized = this.normalize(number);
    if (this.instances.has(normalized)) return this.instances.get(normalized);
    const instance = new BotInstance(normalized, authDir);
    this.instances.set(normalized, instance);
    try {
      await instance.init();
      logger.info(`[instanceManager] Started bot instance ${normalized}`);
      return instance;
    } catch (error) {
      this.instances.delete(normalized);
      logger.error(`[instanceManager] Failed to start ${normalized}: ${error.stack || error.message}`);
      throw error;
    }
  }

  async adoptPairingSession(number, sourceDir) {
    const normalized = this.normalize(number);
    const targetDir = this.authDirFor(normalized);
    const existing = this.instances.get(normalized);
    if (existing) {
      await existing.adoptPairingSession(sourceDir);
      return existing;
    }

    if (this.instances.size >= this.maxInstances) {
      throw new Error('The service has reached its active bot limit. Please upgrade capacity or contact the administrator.');
    }
    fs.mkdirSync(targetDir, { recursive: true });
    for (const entry of fs.readdirSync(sourceDir)) {
      fs.cpSync(path.join(sourceDir, entry), path.join(targetDir, entry), { recursive: true });
    }
    return this.startFromAuth(normalized, targetDir);
  }

  get(number) {
    return this.instances.get(this.normalize(number));
  }

  async stop(number, removeAuth = false) {
    const normalized = this.normalize(number);
    const instance = this.instances.get(normalized);
    if (instance) {
      instance.destroy();
      this.instances.delete(normalized);
    }
    if (removeAuth) fs.rmSync(this.authDirFor(normalized), { recursive: true, force: true });
  }

  /** Explicitly remove an instance from the manager (e.g. on logout) */
  remove(number) {
    this.instances.delete(this.normalize(number));
  }

  list() {
    return [...this.instances.entries()].map(([number, instance]) => ({
      number,
      online: Boolean(instance.isOnline),
    }));
  }

  count() {
    return this.instances.size;
  }
}

const configuredDir = process.env.MULTI_USER_AUTH_DIR || 'auth_sessions';
module.exports = new InstanceManager(path.resolve(__dirname, '..', configuredDir));
module.exports.InstanceManager = InstanceManager;

