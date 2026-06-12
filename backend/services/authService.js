const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const config = require('../config.json');
const User = require('../models/User');

// 生成6位数字验证码
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 创建邮件传输器
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

// 发送验证码
async function sendVerificationCode(email, redisClient) {
  // 检查60秒频率限制
  const limitKey = `code_limit:${email}`;
  const limited = await redisClient.get(limitKey);
  if (limited) {
    throw { status: 429, message: '请60秒后再试' };
  }

  const code = generateCode();

  // 存入 Redis，5分钟过期
  const codeKey = `verify_code:${email}`;
  await redisClient.set(codeKey, code, { EX: 300 });

  // 设置60秒频率限制
  await redisClient.set(limitKey, '1', { EX: 60 });

  // 发送邮件
  await transporter.sendMail({
    from: config.email.user,
    to: email,
    subject: '莲花导航 - 验证码',
    text: `您的验证码是：${code}，有效期5分钟。`,
  });

  return { message: '验证码已发送' };
}

// 用户注册
async function register(email, password, code, redisClient) {
  // 验证验证码
  const codeKey = `verify_code:${email}`;
  const storedCode = await redisClient.get(codeKey);

  if (!storedCode || storedCode !== code) {
    throw { status: 400, message: '验证码错误或已过期' };
  }

  // 检查邮箱唯一性
  const existing = await User.findOne({ email });
  if (existing) {
    throw { status: 409, message: '该邮箱已注册' };
  }

  // 首位注册用户自动设为管理员
  const userCount = await User.countDocuments();
  const isFirstUser = userCount === 0;

  // bcrypt 加密密码并创建用户
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashedPassword, is_admin: isFirstUser });

  // 删除已使用的验证码
  await redisClient.del(codeKey);

  return { message: '注册成功', userId: user._id };
}

// 用户登录
async function login(email, password) {
  const user = await User.findOne({ email });
  if (!user) {
    throw { status: 401, message: '邮箱或密码错误' };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw { status: 401, message: '邮箱或密码错误' };
  }

  const token = jwt.sign({ userId: user._id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      is_admin: user.is_admin,
      nickname: user.nickname || '',
      avatar: user.avatar || '',
      bio: user.bio || '',
    },
  };
}

// 重置密码（通过邮箱验证码）
async function resetPassword(email, password, code, redisClient) {
  // 验证验证码
  const codeKey = `verify_code:${email}`;
  const storedCode = await redisClient.get(codeKey);

  if (!storedCode || storedCode !== code) {
    throw { status: 400, message: '验证码错误或已过期' };
  }

  // 账号必须已注册
  const user = await User.findOne({ email });
  if (!user) {
    throw { status: 404, message: '该邮箱未注册' };
  }

  // bcrypt 加密新密码并更新
  user.password = await bcrypt.hash(password, 10);
  await user.save();

  // 删除已使用的验证码
  await redisClient.del(codeKey);

  return { message: '密码重置成功' };
}

module.exports = { generateCode, sendVerificationCode, register, login, resetPassword };
