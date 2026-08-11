'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');

process.env.PORT = '0';

const pairingManagerPath = require.resolve('../utils/pairingManager');
const instanceManagerPath = require.resolve('../utils/instanceManager');

const sessions = new Map();
const fakePairingManager = {
  async startPairing(phoneNumber) {
    const number = String(phoneNumber).replace(/\D/g, '');
    const session = {
      number,
      accessToken: crypto.randomBytes(32).toString('hex'),
      status: 'awaiting_code',
      code: `${number.slice(-8, -4)}-${number.slice(-4)}`,
      sessionId: null,
    };
    sessions.set(number, session);
    await new Promise((resolve) => setImmediate(resolve));
    return session;
  },
  normalizePhoneNumber(value) {
    return String(value || '').replace(/\D/g, '');
  },
  getStatus(phoneNumber, accessToken) {
    const session = sessions.get(this.normalizePhoneNumber(phoneNumber));
    return session && session.accessToken === String(accessToken) ? session : null;
  },
  getActiveCount() {
    return sessions.size;
  },
};

require.cache[pairingManagerPath] = {
  id: pairingManagerPath,
  filename: pairingManagerPath,
  loaded: true,
  exports: fakePairingManager,
};

require.cache[instanceManagerPath] = {
  id: instanceManagerPath,
  filename: instanceManagerPath,
  loaded: true,
  exports: { count: () => 0 },
};

const { server } = require('../server');

function request(method, requestPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const request = http.request({
      hostname: '127.0.0.1',
      port: server.address().port,
      method,
      path: requestPath,
      headers: payload ? {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      } : undefined,
    }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => resolve({
        status: response.statusCode,
        body: raw ? JSON.parse(raw) : null,
      }));
    });
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

async function waitForServer() {
  if (server.listening) return;
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
}

async function main() {
  await waitForServer();
  const tenants = [
    { phoneNumber: '+254 700 000 001' },
    { phoneNumber: '+254 700 000 002' },
    { phoneNumber: '+254 700 000 003' },
    { phoneNumber: '+254 700 000 004' },
  ];

  const pairingResponses = await Promise.all(
    tenants.map((tenant) => request('POST', '/api/request-pairing', tenant))
  );

  assert.equal(pairingResponses.length, tenants.length);
  assert(pairingResponses.every((response) => response.status === 200 && response.body.success));

  const tokens = pairingResponses.map((response) => response.body.accessToken);
  assert.equal(new Set(tokens).size, tenants.length, 'Each tenant must receive a unique access token');

  const normalizedNumbers = pairingResponses.map((response) => response.body.phoneNumber);
  assert.deepEqual(normalizedNumbers, tenants.map((tenant) => tenant.phoneNumber.replace(/\D/g, '')));

  const statusResponses = await Promise.all(
    pairingResponses.map((response) => request(
      'GET',
      `/api/pairing-code?phoneNumber=${response.body.phoneNumber}&accessToken=${response.body.accessToken}`
    ))
  );
  assert(statusResponses.every((response) => response.status === 200 && response.body.success));
  assert.deepEqual(statusResponses.map((response) => response.body.phoneNumber), normalizedNumbers);
  assert.equal(new Set(statusResponses.map((response) => response.body.code)).size, tenants.length);

  const crossTenantAttempt = await request(
    'GET',
    `/api/pairing-code?phoneNumber=${normalizedNumbers[0]}&accessToken=${tokens[1]}`
  );
  assert.equal(crossTenantAttempt.status, 403, 'A token from another tenant must be rejected');

  const missingTokenAttempt = await request(
    'GET',
    `/api/pairing-code?phoneNumber=${normalizedNumbers[0]}`
  );
  assert.equal(missingTokenAttempt.status, 400, 'Polling without a token must be rejected');

  console.log(`PASS: ${tenants.length} concurrent tenants received isolated pairing sessions.`);
  console.log('PASS: Unique access tokens, valid polling, cross-tenant rejection, and missing-token rejection verified.');
}

main()
  .catch((error) => {
    console.error('FAIL:', error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    if (server.listening) server.close();
  });
