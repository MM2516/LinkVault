require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const db = require('./config/database');
const { nanoid } = require('nanoid');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(err) {
    if (err) return reject(err);
    resolve(this);
  });
});

const migrateVaultItemsSchema = async () => {
  try {
    const columns = await dbAll('PRAGMA table_info(vault_items)');
    const columnNames = columns.map((column) => column.name);

    if (!columnNames.includes('password_hash')) {
      await dbRun('ALTER TABLE vault_items ADD COLUMN password_hash TEXT');
      console.log('Migration complete: added vault_items.password_hash');
    }

    if (!columnNames.includes('owner_user_id')) {
      await dbRun('ALTER TABLE vault_items ADD COLUMN owner_user_id TEXT');
      console.log('Migration complete: added vault_items.owner_user_id');
    }
  } catch (err) {
    console.error('Schema migration failed:', err);
  }
};

migrateVaultItemsSchema();

const getProvidedPassword = (req) => req.headers['x-link-password'] || '';

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7).trim();
};

const getAuthenticatedUser = async (req) => {
  const token = getBearerToken(req);
  if (!token) return null;

  const row = await dbGet(
    `SELECT users.id, users.email
     FROM sessions
     INNER JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?`,
    [token]
  );

  return row || null;
};

const ensurePasswordAccess = async (row, req, res) => {
  if (!row.password_hash) return true;

  const suppliedPassword = getProvidedPassword(req);
  if (!suppliedPassword) {
    res.status(401).json({ error: 'Password required', code: 'PASSWORD_REQUIRED' });
    return false;
  }

  const isMatch = await bcrypt.compare(suppliedPassword, row.password_hash);
  if (!isMatch) {
    res.status(401).json({ error: 'Invalid password', code: 'INVALID_PASSWORD' });
    return false;
  }

  return true;
};

const sanitizeRow = (row) => {
  const { password_hash, ...safeRow } = row;
  return safeRow;
};

const requireAuth = async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  return user;
};

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/zip',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Images, PDF, Zip, and Docs are allowed.'));
    }
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const userId = nanoid(12);
    const passwordHash = await bcrypt.hash(password, 10);
    await dbRun('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [userId, email, passwordHash]);

    const token = nanoid(48);
    await dbRun('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, userId]);

    res.json({ token, user: { id: userId, email } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    const user = await dbGet('SELECT id, email, password_hash FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = nanoid(48);
    await dbRun('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, user.id]);

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    res.json({ user });
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (token) {
      await dbRun('DELETE FROM sessions WHERE token = ?', [token]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/my-links', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const now = new Date().toISOString();
    const links = await dbAll(
      `SELECT
          id,
          type,
          file_name,
          created_at,
          expiry_at,
          max_views,
          current_views,
          CASE
            WHEN expiry_at < ? THEN 'expired'
            WHEN max_views > 0 AND current_views >= max_views THEN 'limit_reached'
            ELSE 'active'
          END AS status
        FROM vault_items
        WHERE owner_user_id = ?
        ORDER BY created_at DESC`,
      [now, user.id]
    );

    res.json({ links });
  } catch (err) {
    console.error('My links error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Max limit is 5MB.' });
        }
        return res.status(400).json({ error: err.message });
      }

      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const currentUser = await getAuthenticatedUser(req);
      const { type, text, expiryDate, maxViews, isOneTime, password } = req.body;
      const id = nanoid(10);
      const expiryAt = expiryDate
        ? new Date(expiryDate).toISOString()
        : new Date(Date.now() + 10 * 60000).toISOString();
      const limit = isOneTime === 'true' ? 1 : parseInt(maxViews, 10) || 0;

      if (type === 'text' && !text) {
        return res.status(400).json({ error: 'Text content is required.' });
      }

      if (type === 'file' && !req.file) {
        return res.status(400).json({ error: 'File is required.' });
      }

      const trimmedPassword = (password || '').trim();
      let passwordHash = null;

      if (trimmedPassword) {
        if (trimmedPassword.length < 4) {
          return res.status(400).json({ error: 'Password must be at least 4 characters.' });
        }
        passwordHash = await bcrypt.hash(trimmedPassword, 10);
      }

      const content = type === 'text' ? text : req.file.filename;

      await dbRun(
        `INSERT INTO vault_items
          (id, type, content, file_name, password_hash, owner_user_id, expiry_at, max_views, current_views)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          id,
          type,
          content,
          type === 'file' ? req.file.originalname : null,
          passwordHash,
          currentUser ? currentUser.id : null,
          expiryAt,
          limit
        ]
      );

      res.json({ url: `http://localhost:5173/v/${id}`, id });
    } catch (uploadErr) {
      console.error('Upload error:', uploadErr);
      res.status(500).json({ error: 'DB Error' });
    }
  });
});

setInterval(async () => {
  const now = new Date().toISOString();
  const query = `
    SELECT id, content, type FROM vault_items
    WHERE type = 'file'
      AND content IS NOT NULL
      AND (
        expiry_at < ?
        OR (max_views > 0 AND current_views >= max_views)
      )
  `;

  try {
    const rows = await dbAll(query, [now]);

    rows.forEach((row) => {
      const filePath = path.join(__dirname, 'uploads', row.content);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Auto-deleted file: ${row.content}`);
      }

      // Keep DB record for dashboard history, only remove blob reference.
      db.run('UPDATE vault_items SET content = NULL WHERE id = ?', [row.id]);
    });
  } catch (cleanupErr) {
    console.error('Cleanup Job Error:', cleanupErr);
  }
}, 60000);

app.get('/api/content/:id', (req, res) => {
  db.get('SELECT * FROM vault_items WHERE id = ?', [req.params.id], async (err, row) => {
    try {
      if (!row) return res.status(403).json({ error: 'Invalid link or content deleted' });
      if (!(await ensurePasswordAccess(row, req, res))) return;

      if (new Date() > new Date(row.expiry_at)) return res.status(403).json({ error: 'Link expired' });

      if (row.type === 'text') {
        if (row.max_views > 0 && row.current_views >= row.max_views) {
          return res.status(403).json({ error: 'View limit reached' });
        }

        db.run('UPDATE vault_items SET current_views = current_views + 1 WHERE id = ?', [row.id], async () => {
          const updatedRow = await dbGet('SELECT * FROM vault_items WHERE id = ?', [row.id]);
          if (!updatedRow) return res.status(500).json({ error: 'Unable to fetch content' });
          res.json(sanitizeRow(updatedRow));
        });

        return;
      }

      res.json(sanitizeRow(row));
    } catch (contentErr) {
      console.error('Content fetch error:', contentErr);
      res.status(500).json({ error: 'Unable to fetch content' });
    }
  });
});

app.get('/api/download/:id', (req, res) => {
  db.get('SELECT * FROM vault_items WHERE id = ?', [req.params.id], async (err, row) => {
    try {
      if (!row || row.type !== 'file') return res.status(404).json({ error: 'Not found' });
      if (!(await ensurePasswordAccess(row, req, res))) return;
      if (new Date() > new Date(row.expiry_at)) return res.status(403).json({ error: 'Link expired' });
      if (row.max_views > 0 && row.current_views >= row.max_views) return res.status(403).json({ error: 'Limit reached' });
      if (!row.content) return res.status(404).json({ error: 'File no longer available' });

      db.run('UPDATE vault_items SET current_views = current_views + 1 WHERE id = ?', [row.id], () => {
        res.download(path.join(__dirname, 'uploads', row.content), row.file_name);
      });
    } catch (downloadErr) {
      console.error('Download error:', downloadErr);
      res.status(500).json({ error: 'Download failed' });
    }
  });
});

app.delete('/api/delete/:id', (req, res) => {
  db.get('SELECT content, type, password_hash, owner_user_id FROM vault_items WHERE id = ?', [req.params.id], async (err, row) => {
    try {
      if (!row) return res.status(404).json({ error: 'Not found' });
      if (!(await ensurePasswordAccess(row, req, res))) return;

      if (row.type === 'file') {
        const filePath = path.join(__dirname, 'uploads', row.content);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      db.run('DELETE FROM vault_items WHERE id = ?', [req.params.id], () => res.json({ success: true }));
    } catch (deleteErr) {
      console.error('Delete error:', deleteErr);
      res.status(500).json({ error: 'Delete failed' });
    }
  });
});

app.listen(5000, () => console.log('Backend Live on 5000'));
