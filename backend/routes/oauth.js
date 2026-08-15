const express = require('express');
const router = express.Router();
const oauthController = require('../controllers/oauthController');
const { authMiddleware } = require('../middleware/auth');

// POST /api/oauth/authorize - 发授权码（需登录）
router.post('/authorize', authMiddleware, oauthController.authorize);

// POST /api/oauth/token - 换 access_token（Discourse 服务器，验 client_secret，无 JWT）
router.post('/token', oauthController.token);

// GET /api/oauth/userinfo - Bearer access_token
router.get('/userinfo', oauthController.userinfo);

module.exports = router;
