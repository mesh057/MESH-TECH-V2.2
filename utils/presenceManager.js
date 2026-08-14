class PresenceManager {
  constructor(settings, logger) {
    this.settings = settings;
    this.logger = logger;
    this.sock = null;
    this.timer = null;
  }

  attach(sock) {
    this.sock = sock;
    this.start();
  }

  start() {
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
    this.stopTimer();
    this.sock = null;
  }

  async setAlwaysOnline(enabled) {
    this.settings.set('wapresence', enabled);
    await this.sync();
  }

  async sync() {
    if (!this.sock || typeof this.sock.sendPresenceUpdate !== 'function') return;
    const presence = this.settings.get('wapresence', false) ? 'available' : 'unavailable';
    try {
      await this.sock.sendPresenceUpdate(presence);
    } catch (error) {
      this.logger?.warn?.(`[presence] Failed to publish ${presence}: ${error.message}`);
    }
  }

  async sendHumanPresence(jid) {
    if (!this.sock || !jid || jid === 'status@broadcast') return;
    const configured = this.settings.get('fakepresence', 'off');
    const mode = configured === 'off'
      ? (process.env.AUTO_TYPING === 'true' ? 'typing' : process.env.AUTO_RECORDING === 'true' ? 'recording' : 'off')
      : configured;
    if (mode !== 'typing' && mode !== 'recording') return;
    const presence = mode === 'typing' ? 'composing' : 'recording';
    try {
      await this.sock.sendPresenceUpdate(presence, jid);
      // Stay in that state for 4 seconds to look real
      setTimeout(() => {
        if (this.sock) {
          this.sock.sendPresenceUpdate('paused', jid).catch(() => {});
        }
      }, 4000).unref?.();
    } catch (error) {
      this.logger?.debug?.(`[presence] Failed to publish ${presence}: ${error.message}`);
    }
  }
}

module.exports = PresenceManager;
