const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/send-code - 发送验证码
router.post('/send-code', authController.sendCode);

// POST /api/auth/register - 注册
router.post('/register', authController.register);

// POST /api/auth/login - 登录
router.post('/login', authController.login);

// GET /api/auth/me - 获取当前用户信息（需登录）
router.get('/me', authMiddleware, authController.getMe);

// PUT /api/auth/profile - 更新当前用户个人信息（需登录）
router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;
