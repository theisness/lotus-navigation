const jwt = require('jsonwebtoken');
const config = require('../config.json');
const User = require('../models/User');

// JWT 验证中间件 - 必须登录
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: '未授权' });
    }

    req.user = { userId: decoded.userId, is_admin: user.is_admin, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: '未授权' });
  }
};

// 可选 JWT 中间件 - 未登录时 req.user 为 null
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.userId);

    if (user) {
      req.user = { userId: decoded.userId, is_admin: user.is_admin, email: user.email };
    } else {
      req.user = null;
    }
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

// 管理员权限中间件 - 需在 authMiddleware 之后使用
const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: '权限不足' });
  }
  next();
};

module.exports = { authMiddleware, optionalAuthMiddleware, adminMiddleware };
