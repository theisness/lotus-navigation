const express = require('express');
const router = express.Router();
const siteSettingController = require('../controllers/siteSettingController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// GET /api/settings/theme - 公开
router.get('/theme', siteSettingController.getTheme);

// PUT /api/settings/theme - 管理员
router.put('/theme', authMiddleware, adminMiddleware, siteSettingController.setTheme);

module.exports = router;
