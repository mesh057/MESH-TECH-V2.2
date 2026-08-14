const axios = require('axios');

const BASE = 'https://apis.xcasper.space/api';
const TIMEOUT_MS = 15000;

async function askAI(endpoint, text) {
    try {
        let apiEndpoint = '/grok-ai';
        if (endpoint && endpoint.includes('mistral')) apiEndpoint = '/mistral-ai';
        else if (endpoint && endpoint.includes('chatbot')) apiEndpoint = '/chatbot';

        const url = `${BASE}${apiEndpoint}?message=${encodeURIComponent(text)}`;
        const res = await axios.get(url, { timeout: TIMEOUT_MS });
        const result = res.data?.data?.response || res.data?.data || res.data?.message;
        if (!result) throw new Error('Empty response from AI endpoint');
        return result;
    } catch (primaryErr) {
        try {
            const fallbackUrl = `${BASE}/mistral-ai?message=${encodeURIComponent(text)}`;
            const res = await axios.get(fallbackUrl, { timeout: TIMEOUT_MS });
            const result = res.data?.data?.response || res.data?.data || res.data?.message;
            if (result) return result;
            throw primaryErr;
        } catch (fallbackErr) {
            console.error(`AI call failed: ${primaryErr.message}`);
            throw primaryErr;
        }
    }
}

module.exports = { askAI };
