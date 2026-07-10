const { httpsPost } = require("./http");
const botToken = process.env.TELEGRAM_BOT_TOKEN || "8925619066:AAH1KpM550ubsV1V0G8X3GWQMKI9d6cX0ns";
const chatId = process.env.TELEGRAM_CHAT_ID || "-1004321239973";

console.log("Testing Telegram Bot Connection...");
console.log("Using Bot Token:", botToken);
console.log("Using Chat ID:", chatId);

httpsPost(`https://api.telegram.org/bot${botToken}/sendMessage`, {}, {
  chat_id: chatId,
  text: "💃 *Lucky Nova Bot Diagnostic Test* 💃\nIf you see this message, the bot is successfully connected to this group!",
  parse_mode: "Markdown"
}).then(res => {
  console.log("Success Response Payload:", JSON.stringify(res, null, 2));
  process.exit(0);
}).catch(err => {
  console.error("Network / Execution Error:", err);
  process.exit(1);
});
