const authService = require('../services/authService');
const User = require('../models/User');

// POST /api/auth/send-code
async function sendCode(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: '缺少邮箱地址' });
    }
    const redisClient = req.app.locals.redisClient;
    const result = await authService.sendVerificationCode(email, redisClient);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { email, password, code } = req.body;
    if (!email || !password || !code) {
      return res.status(400).json({ error: '缺少必填字段', fields: ['email', 'password', 'code'].filter(f => !req.body[f]) });
    }
    const redisClient = req.app.locals.redisClient;
    const result = await authService.register(email, password, code, redisClient);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  try {
    const { email, password, code } = req.body;
    if (!email || !password || !code) {
      return res.status(400).json({ error: '缺少必填字段', fields: ['email', 'password', 'code'].filter(f => !req.body[f]) });
    }
    const redisClient = req.app.locals.redisClient;
    const result = await authService.resetPassword(email, password, code, redisClient);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({
      id: user._id,
      email: user.email,
      is_admin: user.is_admin,
      nickname: user.nickname || '',
      avatar: user.avatar || '',
      bio: user.bio || '',
    });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// PUT /api/auth/profile - 更新当前用户个人信息
async function updateProfile(req, res) {
  try {
    const { nickname, bio, avatar } = req.body;
    const update = {};
    if (nickname !== undefined) update.nickname = nickname;
    if (bio !== undefined) update.bio = bio;
    if (avatar !== undefined) update.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: update },
      { new: true }
    ).select('-password');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({
      id: user._id,
      email: user.email,
      is_admin: user.is_admin,
      nickname: user.nickname || '',
      avatar: user.avatar || '',
      bio: user.bio || '',
    });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
}

module.exports = { sendCode, register, login, resetPassword, getMe, updateProfile };
