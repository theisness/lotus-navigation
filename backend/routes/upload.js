const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { uploadImage } = require('../controllers/uploadController');

// POST /api/upload/image - 上传背景图片（需登录）
router.post('/image', authMiddleware, uploadImage);

module.exports = router;
