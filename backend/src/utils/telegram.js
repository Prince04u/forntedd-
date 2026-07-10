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
    if (statusType === "created") {
      statusText = `Created<tg-emoji emoji-id="6068719730468853667">👀</tg-emoji>`;
    } else if (statusType === "success") {
      statusText = `Suceess<tg-emoji emoji-id="6235445786759402354">💸</tg-emoji>`;
    } else {
      statusText = `Failed<tg-emoji emoji-id="6269019133795374514">🚫</tg-emoji>`;
    }

    const text =
      `<tg-emoji emoji-id="6307506297080121060">💃</tg-emoji>Recharge Request Created <tg-emoji emoji-id="6307506297080121060">💃</tg-emoji>\n\n` +
      ` 💵Amount :- ₹${amount} / ${usdAmount}$ \n\n` +
      ` <tg-emoji emoji-id="6242510612824332116">🕐</tg-emoji> Time : ${time}  \n\n` +
      `  <tg-emoji emoji-id="6068736321927519921">➡️</tg-emoji>Date : ${date}\n\n` +
      `<tg-emoji emoji-id="6068664995405633126">🌈</tg-emoji>Uid :-${uid}\n\n` +
      `<tg-emoji emoji-id="6068901240081748746">💥</tg-emoji>order id :-${orderId}\n\n` +
      `<tg-emoji emoji-id="6269105110450705259">🛡</tg-emoji>Txid :- ${txid}\n\n` +
      `<tg-emoji emoji-id="6068945070223005574">🆘</tg-emoji>Status :-${statusText}`;

    const botToken = "8925619066:AAH1KpM550ubsV1V0G8X3GWQMKI9d6cX0ns";
    const chatId = "-5417636031";

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
