const axios = require('axios');

const BASE = 'https://apis.davidcyril.name.ng/ai';
const TIMEOUT_MS = 25000;
const FALLBACK_ENDPOINT = 'gpt-4o'; // known-good endpoint used as a safety net

async function rawCall(endpoint, text) {
    const url = `${BASE}/${endpoint}?text=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { timeout: TIMEOUT_MS });
    const result = res.data?.result || res.data?.data || res.data?.message;
    if (!result) throw new Error('Empty response from AI endpoint');
    return result;
}

/**
 * Calls a model endpoint on the AI proxy. If the model-specific endpoint
 * fails (down, renamed, rate-limited, etc.) it automatically retries once
 * against the known-working gpt-4o endpoint so the command still returns
 * a real answer instead of a dead "API error" message.
 */
async function askAI(endpoint, text) {
    try {
        return await rawCall(endpoint, text);
    } catch (primaryErr) {
        if (endpoint === FALLBACK_ENDPOINT) {
            throw primaryErr;
        }
        try {
            return await rawCall(FALLBACK_ENDPOINT, text);
        } catch (fallbackErr) {
            console.error(`AI call failed — primary(${endpoint}): ${primaryErr.message} | fallback: ${fallbackErr.message}`);
            throw fallbackErr;
        }
    }
}

module.exports = { askAI };
