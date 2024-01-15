const { MESSAGES } = require("../configs/messages");

const sqlite3 = require("sqlite3").verbose();

let db = new sqlite3.Database("./worldland_bridge.sqlite", (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log(MESSAGES.DB_CONNECT);
});
module.exports = { db };
