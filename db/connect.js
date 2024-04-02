const path = require("path");
const { MESSAGES } = require("../configs/messages");

const sqlite3 = require("sqlite3").verbose();

let db = new sqlite3.Database(
  path.resolve(__dirname, "../tx_queue.db"),
  sqlite3.OPEN_READWRITE,
  (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log(MESSAGES.DB_CONNECT);
  }
);
module.exports = { db };
