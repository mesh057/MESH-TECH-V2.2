/**
 * ai2.js — AI chat commands: llama, mistral, deepseek, chatgpt, chatbot
 * Uses verified working endpoints (apis.davidcyril.name.ng).
 */
'use strict';
const axios = require('axios');
const BASE = 'https://apis.davidcyril.name.ng';

async function chatWith(prompt, model) {
  const endpoints = {
    llama: '/ai/llama',
    mistral: '/ai/mistral',
    deepseek: '/ai/deepseek',
    chatgpt: '/ai/chatgpt',
  };
  const { data } = await axios.get(`${BASE}${endpoints[model]}`, {
    params: { prompt },
    timeout: 60000,
  });
  // Accept multiple response shapes
  const text = data?.message || data?.response || data?.result || data?.reply || data?.content || data?.answer || JSON.stringify(data);
  if (typeof text !== 'string' || text.length < 2) throw new Error('empty response');
  return text;
}

function makeAiCmd(name, label, category = 'AI') {
  return {
    name,
    description: `Chat with ${label} AI. Usage: .${name} your question`,
    category,
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const text = args.join(' ').trim();
      if (!text) return await sock.sendMessage(jid, { text: `❌ Usage: \`.${name} your question\`` }, { quoted: msg });
      await sock.sendMessage(jid, { text: `⏳ Asking ${label}...` }, { quoted: msg });
      try {
        const answer = await chatWith(text, name === 'chatbot' ? 'chatgpt' : name);
        await sock.sendMessage(jid, { text: `🤖 *${label.toUpperCase()}*\n\n${answer}` }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ ${label} AI error: ${err.message}\n\nTry the generic .ai command instead.` }, { quoted: msg });
      }
    },
  };
}

module.exports = [
  makeAiCmd('llama', 'Llama'),
  makeAiCmd('mistral', 'Mistral'),
  makeAiCmd('deepseek', 'DeepSeek'),
  makeAiCmd('chatgpt', 'ChatGPT'),
  {
    name: 'chatbot',
    description: 'General chatbot (ChatGPT-style). Usage: .chatbot your question',
    category: 'AI',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const text = args.join(' ').trim();
      if (!text) return await sock.sendMessage(jid, { text: '❌ Usage: `.chatbot your question`' }, { quoted: msg });
      await sock.sendMessage(jid, { text: '⏳ Thinking...' }, { quoted: msg });
      try {
        const answer = await chatWith(text, 'chatgpt');
        await sock.sendMessage(jid, { text: `🤖 *CHATBOT*\n\n${answer}` }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(jid, { text: `❌ Chatbot error: ${err.message}` }, { quoted: msg });
      }
    },
  },
];
