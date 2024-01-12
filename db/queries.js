const { db } = require("./connect");
const { COLUMNS, TABLES } = require("./tables");

function insert_string(table_name, column_names) {
  const values = Array(column_names.length).fill("?").join(", ");
  return `INSERT INTO ${table_name} (${column_names.join(
    ", "
  )}) VALUES (${values})`;
}

async function insert(rows) {
  try {
    db.serialize(() => {
      let _insert = insert_string(TABLES.TX_QUEUE, [
        COLUMNS.from_address,
        COLUMNS.to_address,
        COLUMNS.amount,
        COLUMNS.nonce,
        COLUMNS.token,
        COLUMNS.timestamp,
        COLUMNS.chain,
        COLUMNS.processed,
        COLUMNS.function_type,
      ]);
      let stmt = db.prepare(_insert);
      stmt.run(rows, (err) => {
        if (err) {
          console.error(err.message);
          // Handle error, perhaps rollback transaction or log
        }
      });
      stmt.finalize();
    });
  } catch (err) {
    console.error(err);
  }
}

module.exports = { insert_string, insert };
