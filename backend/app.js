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

// 请求/响应日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, body } = req;

  console.log(`--> ${method} ${originalUrl}`, Object.keys(body || {}).length ? JSON.stringify(body) : '');

  const originalJson = res.json.bind(res);
  res.json = (data) => {
    const duration = Date.now() - start;
    console.log(`<-- ${method} ${originalUrl} ${res.statusCode} ${duration}ms`, JSON.stringify(data));
    return originalJson(data);
  };

  next();
});

// 静态文件服务 - 背景图片
app.use('/images', express.static(path.join(__dirname, 'images')));

// 路由挂载
app.use('/api/auth', require('./routes/auth'));
app.use('/api/nav-items', require('./routes/navItem'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/settings', require('./routes/siteSetting'));
app.use('/api/admin', require('./routes/admin'));

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
