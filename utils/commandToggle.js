'use strict';

class CommandToggle {
    constructor(settingsStore) {
        this.settingsStore = settingsStore;
        this.DISABLED_KEY = 'disabledCommands';
    }

    normalizeCommandName(value) {
        return String(value || '')
            .trim()
            .replace(/^[.!#/]+/, '')
            .toLowerCase();
    }

    getDisabledCommands() {
        const raw = this.settingsStore.get(this.DISABLED_KEY, []);
        if (!Array.isArray(raw)) return new Set();
        return new Set(raw.map(this.normalizeCommandName).filter(Boolean));
    }

    isDisabled(name) {
        return this.getDisabledCommands().has(this.normalizeCommandName(name));
    }

    setDisabled(name, disabled) {
        const normalized = this.normalizeCommandName(name);
        if (!normalized) return false;

        const disabledCommands = this.getDisabledCommands();
        if (disabled) disabledCommands.add(normalized);
        else disabledCommands.delete(normalized);

        this.settingsStore.set(this.DISABLED_KEY, [...disabledCommands].sort());
        return true;
    }

    listDisabled() {
        return [...this.getDisabledCommands()].sort();
    }
}

module.exports = CommandToggle;
