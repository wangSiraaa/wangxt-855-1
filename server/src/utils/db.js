const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/bank_confirmation.db');

let dbInstance = null;

function getDB() {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('数据库连接失败:', err.message);
        throw err;
      }
      console.log('数据库连接成功');
    });
    dbInstance.run('PRAGMA foreign_keys = ON');
  }
  return dbInstance;
}

function closeDB() {
  if (dbInstance) {
    dbInstance.close((err) => {
      if (err) {
        console.error('关闭数据库失败:', err.message);
      }
      dbInstance = null;
    });
  }
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function serialize(fn) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.serialize(() => {
      fn(db, resolve, reject);
    });
  });
}

module.exports = {
  getDB,
  closeDB,
  run,
  get,
  all,
  serialize
};
