const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const ssoController = require('../controllers/ssoController');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/send-code - 发送验证码
router.post('/send-code', authController.sendCode);

// POST /api/auth/register - 注册
router.post('/register', authController.register);

// POST /api/auth/login - 登录
router.post('/login', authController.login);

// POST /api/auth/reset-password - 通过邮箱验证码重置密码
router.post('/reset-password', authController.resetPassword);

// GET /api/auth/me - 获取当前用户信息（需登录）
router.get('/me', authMiddleware, authController.getMe);

// PUT /api/auth/profile - 更新当前用户个人信息（需登录）
router.put('/profile', authMiddleware, authController.updateProfile);

// POST /api/auth/sso/mediacms - 影院 HMAC 跳转签发（需登录）
router.post('/sso/mediacms', authMiddleware, ssoController.mediacms);

// POST /api/auth/sso/chat - 蓝莲花 chat HMAC 断言签发（需登录）
router.post('/sso/chat', authMiddleware, ssoController.chat);

module.exports = router;
