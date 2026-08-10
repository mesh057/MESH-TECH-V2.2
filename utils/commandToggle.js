'use strict';

const settingsStore = require('./settingsStore');

const DISABLED_KEY = 'disabledCommands';

function normalizeCommandName(value) {
  return String(value || '')
    .trim()
    .replace(/^[.!#/]+/, '')
    .toLowerCase();
}

function getDisabledCommands() {
  const raw = settingsStore.get(DISABLED_KEY, []);
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.map(normalizeCommandName).filter(Boolean));
}

function isDisabled(name) {
  return getDisabledCommands().has(normalizeCommandName(name));
}

function setDisabled(name, disabled) {
  const normalized = normalizeCommandName(name);
  if (!normalized) return false;

  const disabledCommands = getDisabledCommands();
  if (disabled) disabledCommands.add(normalized);
  else disabledCommands.delete(normalized);

  settingsStore.set(DISABLED_KEY, [...disabledCommands].sort());
  return true;
}

function listDisabled() {
  return [...getDisabledCommands()].sort();
}

module.exports = {
  normalizeCommandName,
  isDisabled,
  setDisabled,
  listDisabled,
};
