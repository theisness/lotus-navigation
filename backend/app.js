const express = require('express');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const cors = require('cors');
const path = require('path');
const config = require('./config.json');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // /api/oauth/token 兼容表单提交

// 请求/响应日志中间件
// 敏感字段（凭证/签名/授权码/令牌）一律不落日志（2026-08-15 SSO 安全审查）
const SENSITIVE_KEYS = new Set([
  'client_secret', 'secret', 'code', 'access_token', 'refresh_token',
  'assertion', 'sig', 'sso', 'password', 'token', 'authorization',
]);
function redact(v) {
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, val] of Object.entries(v)) {
      o[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[redacted]' : redact(val);
    }
    return o;
  }
  // URL query 里拼的敏感参数（如 redirect 里的 sso=/sig=）也脱敏
  if (typeof v === 'string') {
    return v.replace(/((?:sso|sig|assertion|code|access_token|client_secret)=)[^&\s"']+/gi, '$1[redacted]');
  }
  return v;
}
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, body } = req;

  console.log(`--> ${method} ${originalUrl}`, Object.keys(body || {}).length ? JSON.stringify(redact(body)) : '');

  const originalJson = res.json.bind(res);
  res.json = (data) => {
    const duration = Date.now() - start;
    console.log(`<-- ${method} ${originalUrl} ${res.statusCode} ${duration}ms`, JSON.stringify(redact(data)));
    return originalJson(data);
  };

  next();
});

// 静态文件服务 - 背景图片（强缓存30天）
app.use('/images', express.static(path.join(__dirname, 'images'), {
  maxAge: '30d',
  immutable: true,
}));

// 路由挂载
app.use('/api/auth', require('./routes/auth'));
app.use('/api/nav-items', require('./routes/navItem'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/settings', require('./routes/siteSetting'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/download', require('./routes/download'));
app.use('/api/nav-groups', require('./routes/navGroup'));
app.use('/api/oauth', require('./routes/oauth'));

// Redis 客户端
const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  username: config.redis.username || undefined,
  password: config.redis.password || undefined,
});

redisClient.on('error', (err) => console.error('Redis 连接错误:', err));

// 导出 redis 客户端供其他模块使用
app.locals.redisClient = redisClient;

async function start() {
  try {
    await mongoose.connect(config.mongodb.url);
    console.log('MongoDB 已连接');

    await redisClient.connect();
    console.log('Redis 已连接');

    app.listen(config.port, () => {
      console.log(`服务器运行在 http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
