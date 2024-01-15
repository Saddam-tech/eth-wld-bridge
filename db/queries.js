const { db } = require("./connect");
const { COLUMNS } = require("./tables");

const columns = [
  COLUMNS.from_address,
  COLUMNS.to_address,
  COLUMNS.amount,
  COLUMNS.nonce,
  COLUMNS.token,
  COLUMNS.timestamp,
  COLUMNS.chain,
  COLUMNS.processed,
  COLUMNS.function_type,
];

function insert_string(table_name, column_names) {
  const values = Array(column_names.length).fill("?").join(", ");
  return `INSERT INTO ${table_name} (${column_names.join(
    ", "
  )}) VALUES (${values})`;
}

async function insert(table, rows) {
  try {
    db.serialize(() => {
      let _insert = insert_string(table, columns);
      let stmt = db.prepare(_insert);
      stmt.run(rows, (err) => {
        if (err) {
          console.error(err);
          // Handle error, perhaps rollback transaction or log
        }
      });
      stmt.finalize(() => {
        // close the db connection
        db.close((err) => {
          console.error(err);
        });
      });
    });
  } catch (err) {
    console.error(err);
  }
}

async function query_all(table) {
  try {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        let sql = `SELECT * FROM ${table}`;
        db.all(sql, [], (err, rows) => {
          if (err) {
            reject(err);
          }
          resolve(rows);
          db.close((err) => {
            console.error(err);
          });
        });
      });
    });
  } catch (err) {
    console.error(err);
  }
}

async function query_params(table, params, values) {
  try {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        let sql = `SELECT * FROM ${table} WHERE ${params[0]} = ? AND ${params[1]} = ? AND ${params[2]} = ?`;
        let stmt = db.prepare(sql);
        stmt.all(values, (err, rows) => {
          if (err) {
            reject(err);
          }
          resolve(rows);
        });
        stmt.finalize(() => {
          // close the db connection
          db.close((err) => {
            console.error(err);
          });
        });
      });
    });
  } catch (err) {
    console.error(err);
  }
}

async function main() {
  const tx_queue = await query_all("tx_queue");
  console.log({ tx_queue });
}

main();

module.exports = { insert, query_all, query_params };
