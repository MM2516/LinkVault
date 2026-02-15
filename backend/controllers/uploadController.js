const { nanoid } = require('nanoid');
const db = require('../config/database');
const path = require('path');

exports.uploadContent = (req, res) => {
  const { type, text, expiryDate, maxViews } = req.body;
  const id = nanoid(10);
  
  let expiryAt = expiryDate ? new Date(expiryDate).toISOString() : new Date(Date.now() + 10 * 60000).toISOString();
  const limitValue = parseInt(maxViews) || 0; 

  const content = type === 'text' ? text : req.file.filename;
  const fileName = type === 'file' ? req.file.originalname : null;

  db.run(
    `INSERT INTO vault_items (id, type, content, file_name, expiry_at, max_views, current_views) VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [id, type, content, fileName, expiryAt, limitValue],
    (err) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ url: `http://localhost:5173/v/${id}` });
    }
  );
};

exports.getContent = (req, res) => {
  const vaultId = req.params.id;
  db.get(`SELECT * FROM vault_items WHERE id = ?`, [vaultId], (err, row) => {
    if (!row) return res.status(403).json({ error: "Invalid link" });
    if (new Date() > new Date(row.expiry_at)) return res.status(403).json({ error: "Link expired" });
    
    // For text: Check view limit and increment immediately
    if (row.type === 'text') {
      if (row.max_views > 0 && row.current_views >= row.max_views) {
        return res.status(403).json({ error: "View limit reached" });
      }
      db.run(`UPDATE vault_items SET current_views = current_views + 1 WHERE id = ?`, [vaultId], () => {
        res.json(row);
      });
    } else {
      // For files: Just show the page (don't increment yet, wait for download)
      if (row.max_views > 0 && row.current_views >= row.max_views) {
        return res.status(403).json({ error: "Download limit reached" });
      }
      res.json(row);
    }
  });
};

exports.downloadFile = (req, res) => {
  const vaultId = req.params.id;
  db.get(`SELECT * FROM vault_items WHERE id = ?`, [vaultId], (err, row) => {
    if (!row || row.type !== 'file') return res.status(403).send("Invalid request");
    
    if (row.max_views > 0 && row.current_views >= row.max_views) {
      return res.status(403).send("Download limit reached");
    }

    db.run(`UPDATE vault_items SET current_views = current_views + 1 WHERE id = ?`, [vaultId], () => {
      const filePath = path.join(__dirname, '..', 'uploads', row.content);
      res.download(filePath, row.file_name);
    });
  });
};