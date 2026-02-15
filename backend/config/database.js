const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./linkvault.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS vault_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content TEXT,
    file_name TEXT,
    password_hash TEXT,
    owner_user_id TEXT,
    expiry_at DATETIME NOT NULL,
    max_views INTEGER DEFAULT 0,
    current_views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
  )`);
});

module.exports = db;
