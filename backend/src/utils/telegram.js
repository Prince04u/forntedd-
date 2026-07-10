const { httpsPost } = require("./http");
const logger = require("../config/logger");

const formatTelegramDate = (dateObj) => {
  // Always format in Indian Standard Time (IST, UTC+5:30) as indicated by timezone metadata
  const utc = dateObj.getTime() + dateObj.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(utc + istOffset);

  const pad = (n) => String(n).padStart(2, "0");
  const hh = pad(istDate.getHours());
  const mm = pad(istDate.getMinutes());
  const ss = pad(istDate.getSeconds());

  const dd = pad(istDate.getDate());
  const mo = pad(istDate.getMonth() + 1);
  const yy = String(istDate.getFullYear()).slice(-2);

  return {
    time: `${hh}:${mm}:${ss}`,
    date: `${dd}/${mo}/${yy}`,
  };
};

const sendTelegramNotification = async (deposit, user, statusType) => {
  try {
    const { time, date } = formatTelegramDate(new Date(deposit.createdAt));
    const amount = deposit.amount;
    const usdAmount = deposit.payAmount || (deposit.amount / 98).toFixed(2);
    const uid = user.uid || user._id.toString();
    const orderId = deposit._id.toString();
    const txid = deposit.txHash || "Not submitted yet";

    let statusText = "";
    let titleText = "";

    if (statusType === "created") {
      statusText = "Created 👀";
      titleText = "💃 Recharge Request Created 💃";
    } else if (statusType === "success") {
      statusText = "Success 💸";
      titleText = "🎉 Recharge Request Success 🎉";
    } else {
      statusText = "Failed 🚫";
      titleText = "❌ Recharge Request Failed ❌";
    }

    const text =
      `<b>${titleText}</b>\n\n` +
      `💵 Amount :- ₹${amount} / ${usdAmount}$ \n\n` +
      `🕐 Time : ${time} \n\n` +
      `➡️ Date : ${date}\n\n` +
      `🌈 Uid :- ${uid}\n\n` +
      `💥 Order ID :- ${orderId}\n\n` +
      `🛡 Txid :- ${txid}\n\n` +
      `🆘 Status :- <b>${statusText}</b>`;

    const botToken = "8925619066:AAH1KpM550ubsV1V0G8X3GWQMKI9d6cX0ns";
    const chatId = "-1004321239973";

    await httpsPost(`https://api.telegram.org/bot${botToken}/sendMessage`, {}, {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
    });
  } catch (err) {
    logger.error("Failed to send Telegram notification:", err);
  }
};

module.exports = {
  sendTelegramNotification,
};
