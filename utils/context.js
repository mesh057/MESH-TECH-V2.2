'use strict';

const { AsyncLocalStorage } = require('async_hooks');
const storage = new AsyncLocalStorage();

function runWithContext(resources, fn) {
    return storage.run(resources, fn);
}

function getContext() {
    return storage.getStore();
}

module.exports = { runWithContext, getContext };
