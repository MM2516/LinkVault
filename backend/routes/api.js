const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadContent, getContent } = require('../controllers/uploadController');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.post('/upload', upload.single('file'), uploadContent);
router.get('/content/:id', getContent);

module.exports = router;