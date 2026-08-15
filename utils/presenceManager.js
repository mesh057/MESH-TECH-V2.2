class PresenceManager {
  constructor(settings, logger) {
    this.settings = settings;
    this.logger = logger;
    this.sock = null;
    this.timer = null;
    this.authenticated = false;
  }

  attach(sock) {
    this.stopTimer();
    this.sock = sock;
    this.authenticated = Boolean(sock?.user?.id);
    if (this.authenticated) this.start();
  }

  markReady() {
    if (!this.sock?.user?.id) return false;
    this.authenticated = true;
    this.start();
    return true;
  }

  markNotReady() {
    this.authenticated = false;
    this.stopTimer();
  }

  start() {
    if (!this.authenticated || !this.sock?.user?.id) return;
    this.stopTimer();
    this.sync().catch(() => {});
    this.timer = setInterval(() => this.sync().catch(() => {}), 25_000);
    this.timer.unref?.();
  }

  stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  detach() {
    this.markNotReady();
    this.sock = null;
  }

  async setAlwaysOnline(enabled) {
    this.settings.set('wapresence', enabled);
    if (this.authenticated) await this.sync();
  }

  async sync() {
    if (!this.authenticated || !this.sock?.user?.id || typeof this.sock.sendPresenceUpdate !== 'function') return;
    const val = this.settings.get('wapresence', 'off');
    const enabled = (val !== 'off' && val !== false && val !== null);
    const presence = enabled ? 'available' : 'unavailable';
    try {
      await this.sock.sendPresenceUpdate(presence);
    } catch (error) {
      this.logger?.warn?.(`[presence] Failed to publish ${presence}: ${error.message}`);
    }
  }

  async sendHumanPresence(jid) {
    if (!this.authenticated || !this.sock?.user?.id || !jid || jid === 'status@broadcast') return;

    const isGroup = jid.endsWith('@g.us');
    const shouldRun = (val) => {
      if (!val || val === 'off' || val === false) return false;
      if (val === 'all' || val === true) return true;
      if (val === 'p' && !isGroup) return true;
      if (val === 'g' && isGroup) return true;
      return false;
    };

    const autotyping = this.settings.get('autotyping', false);
    const autorecording = this.settings.get('autorecording', false);

    let mode = 'off';
    if (shouldRun(autorecording)) mode = 'recording';
    else if (shouldRun(autotyping)) mode = 'typing';

    if (mode === 'off') {
      const legacy = this.settings.get('fakepresence', 'off');
      if (legacy === 'typing' || legacy === 'recording') mode = legacy;
      else if (process.env.AUTO_TYPING === 'true') mode = 'typing';
      else if (process.env.AUTO_RECORDING === 'true') mode = 'recording';
    }

    if (mode !== 'typing' && mode !== 'recording') return;
    const presence = mode === 'typing' ? 'composing' : 'recording';
    try {
      await this.sock.sendPresenceUpdate(presence, jid);
      setTimeout(() => {
        if (this.authenticated && this.sock?.user?.id) {
          this.sock.sendPresenceUpdate('paused', jid).catch(() => {});
        }
      }, 4000).unref?.();
    } catch (error) {
      this.logger?.debug?.(`[presence] Failed to publish ${presence}: ${error.message}`);
    }
  }
}

module.exports = PresenceManager;
