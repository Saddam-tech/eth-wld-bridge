const TelegramBot = require("node-telegram-bot-api");
const token = "6763159391:AAGCdk_66lQTmebSOFZOVr7T9GdsbAHifKQ";
const telegram_bot = new TelegramBot(token, { polling: true });
const chat_id = 219632451;

function sendMessage(message) {
  try {
    telegram_bot.sendMessage(chat_id, message);
  } catch (err) {
    console.log(err);
  }
}

module.exports = { telegram_bot, chat_id, sendMessage };
