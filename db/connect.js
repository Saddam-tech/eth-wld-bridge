const sqlite3 = require("sqlite3").verbose();

let db = new sqlite3.Database("./worldland_bridge", (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Connected to the SQlite database!");
});

db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Closing the database connection...");
});

module.exports = { db };
