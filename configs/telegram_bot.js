const TelegramBot = require("node-telegram-bot-api");
const { MESSAGES } = require("./messages");
const db = require("../db/mariadb/models");
const { TABLES } = require("../db/tables");
const token = "6763159391:AAGCdk_66lQTmebSOFZOVr7T9GdsbAHifKQ";
const telegram_bot = new TelegramBot(token, { polling: true });

function telegram_listener() {
  try {
    telegram_bot.onText(/\/start/, async (msg) => {
      telegram_bot.sendMessage(
        msg.chat.id,
        MESSAGES.WELCOME(msg.chat.first_name)
      );
      let {
        id: chat_id,
        first_name: firstname,
        last_name: lastname,
        username,
      } = msg.chat;
      await db[TABLES.TELEGRAM_LISTENER].create({
        chat_id,
        firstname,
        lastname,
        username,
        active: 1,
      });
    });
  } catch (err) {
    console.log(err);
  }
}

async function sendMessage(message) {
  try {
    const users = await db[TABLES.TELEGRAM_LISTENER].findAll({
      where: {
        active: 1,
      },
    });
    for (let i = 0; i < users.length; i++) {
      telegram_bot.sendMessage(users[i]?.chat_id, message);
    }
  } catch (err) {
    console.log(err);
  }
}

module.exports = { telegram_bot, sendMessage, telegram_listener };
