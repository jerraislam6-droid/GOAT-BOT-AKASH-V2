const axios = require("axios");
const fs = require("fs");
const path = __dirname + "/coinxbalance.json";

// coinxbalance.json না থাকলে বানানো
if (!fs.existsSync(path)) {
  fs.writeFileSync(path, JSON.stringify({}, null, 2));
}

// ব্যালেন্স পড়া
function getBalance(userID) {
  const data = JSON.parse(fs.readFileSync(path));
  if (data[userID]?.balance != null) return data[userID].balance;

  // যদি তুমি হও, ডিফল্ট 10,000 — অন্যরা 100
  if (userID === "100078049308655") return 10000;
  return 100;
}

// ব্যালেন্স আপডেট
function setBalance(userID, balance) {
  const data = JSON.parse(fs.readFileSync(path));
  data[userID] = { balance };
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// ব্যালেন্স ফরম্যাটিং ফাংশন
function formatBalance(num) {
  if (num >= 1e12) return (num / 1e12).toFixed(2).replace(/\.00$/, '') + "T$";
  if (num >= 1e9) return (num / 1e9).toFixed(2).replace(/\.00$/, '') + "B$";
  if (num >= 1e6) return (num / 1e6).toFixed(2).replace(/\.00$/, '') + "M$";
  if (num >= 1e3) return (num / 1e3).toFixed(2).replace(/\.00$/, '') + "k$";
  return num + "$";
}

module.exports.config = {
  name: "quiz",
  version: "3.0.5",
  author: "Akash × ChatGPT",
  countDown: 5,
  role: 0,
  shortDescription: "Bangla Quiz game with coin system",
  longDescription: "Play fun Bangla quizzes and earn or lose coins based on your answer!",
  category: "game",
  guide: {
    en: "{p}quiz\n{p}quiz h (for help)"
  }
};

const timeoutDuration = 20 * 1000; // 20 seconds

module.exports.onStart = async function ({ api, event, args }) {
  const { threadID, senderID, messageID } = event;
  let balance = getBalance(senderID);

  if (balance < 30) {
    return api.sendMessage(
      "❌ You don't have enough Coins to play! Minimum 30 Coins required.",
      threadID,
      messageID
    );
  }

  // Help message
  if (args[0]?.toLowerCase() === "h") {
    return api.sendMessage(
      `🧠 𝗤𝘂𝗶𝘇 𝗚𝘂𝗶𝗱𝗲:\n\n` +
      `➤ Command: quiz\n` +
      `➤ Correct Answer: +1000 Coins\n` +
      `➤ Wrong Answer: -50 Coins\n` +
      `➤ Minimum 30 Coins required\n` +
      `➤ 20 seconds to answer\n\n` +
      `⚡ Good Luck!`,
      threadID,
      messageID
    );
  }

  try {
    const res = await axios.get(`https://rubish-apihub.onrender.com/rubish/quiz-api?category=Bangla&apikey=rubish69`);
    const data = res.data;

    if (!data.question || !data.answer)
      throw new Error("Invalid quiz data received.");

    const formatted =
`╭──✦ ${data.question}
├‣ 𝗔) ${data.A}
├‣ 𝗕) ${data.B}
├‣ 𝗖) ${data.C}
├‣ 𝗗) ${data.D}
╰──────────────────‣ Reply with your answer (A/B/C/D). ⏰ 20s`;

    api.sendMessage(formatted, threadID, async (err, info) => {
      if (err) return console.error(err);

      const timeout = setTimeout(async () => {
        const index = global.client.handleReply.findIndex(e => e.messageID === info.messageID);
        if (index !== -1) {
          try {
            await api.unsendMessage(info.messageID);
            api.sendMessage(`⏰ Time's up!\n✅ The correct answer was: ${data.answer}`, threadID);
          } catch (e) {
            console.error(e);
          }
          global.client.handleReply.splice(index, 1);
        }
      }, timeoutDuration);

      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: senderID,
        answer: data.answer,
        timeout
      });
    });

  } catch (err) {
    console.error("Quiz API Error:", err);
    api.sendMessage("❌ Failed to load quiz data!", threadID, messageID);
  }
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { senderID, messageID, threadID, body } = event;

  if (senderID !== handleReply.author) return;

  const userAnswer = body.trim().toUpperCase();
  if (!["A", "B", "C", "D"].includes(userAnswer)) {
    return api.sendMessage("⚠️ Please enter a valid option: A, B, C or D", threadID, messageID);
  }

  clearTimeout(handleReply.timeout);

  let balance = getBalance(senderID);

  if (userAnswer === handleReply.answer) {
    balance += 1000;
    setBalance(senderID, balance);

    await api.unsendMessage(handleReply.messageID);
    return api.sendMessage(
      `✅ Correct!\n💰 You earned 1000 Coins\n📌 New Balance: ${formatBalance(balance)}`,
      threadID,
      messageID
    );
  } else {
    balance -= 50;
    if (balance < 0) balance = 0;
    setBalance(senderID, balance);

    return api.sendMessage(
      `❌ Wrong answer!\n✅ Correct answer: ${handleReply.answer}\n💸 50 Coins deducted\n📌 New Balance: ${formatBalance(balance)}`,
      threadID,
      messageID
    );
  }
};
