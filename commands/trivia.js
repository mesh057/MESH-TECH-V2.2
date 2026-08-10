const axios = require('axios');
module.exports = {
  name: 'trivia',
  description: 'Get a random trivia question (Open Trivia DB).',
  category: 'FUN',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple', { timeout: 15000 });
      const r = data.results?.[0];
      if (!r) throw new Error('no result');
      const choices = [...r.incorrect_answers, r.correct_answer].sort(() => Math.random() - 0.5);
      const letters = ['A', 'B', 'C', 'D'];
      const list = choices.map((c, i) => letters[i] + '. ' + c).join(String.fromCharCode(10));
      const text = '⛃ *𝗠𝗘𝗦𝗛-𝗧𝗘𝗖𝗛*  ⟿  *TRIVIA*' + String.fromCharCode(10) + String.fromCharCode(10) + '❓ ' + r.question + String.fromCharCode(10) + String.fromCharCode(10) + list + String.fromCharCode(10) + String.fromCharCode(10) + '(Answer: ' + r.correct_answer + ')';
      await sock.sendMessage(jid, { text }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to fetch trivia: ${err.message}` }, { quoted: msg });
    }
  },
};
