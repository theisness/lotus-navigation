const crypto = require('crypto');
const config = require('../config.json');
const User = require('../models/User');

// OAuth2 授权码服务（社区 Discourse oauth2-basic 插件用）
// 密钥与客户端登记在 config.json 的 oauth.clients（gitignore，不进库）

const CODE_TTL = 300; // 授权码 5 分钟
const TOKEN_TTL = 300; // access_token 5 分钟
const RATE_LIMIT = 10; // token/authorize 失败限流：每 client 10 次/分钟

function getClients() {
  return (config.oauth && config.oauth.clients) || [];
}

function findClient(clientId) {
  return getClients().find((c) => c.id === clientId) || null;
}

// 校验客户端与 redirect_uri（整串精确匹配）
function validateClient(clientId, redirectUri) {
  const client = findClient(clientId);
  if (!client) return null;
  if (redirectUri && !client.redirectUris.includes(redirectUri)) return null;
  return client;
}

function verifyClientSecret(client, secret) {
  if (!client || !secret) return false;
  const a = Buffer.from(String(client.secret));
  const b = Buffer.from(String(secret));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// 简单限流：失败次数按 client_id 计，10 次/分钟
async function hitRateLimit(redisClient, bucket) {
  const key = `oauth_rl:${bucket}`;
  const n = await redisClient.incr(key);
  if (n === 1) await redisClient.expire(key, 60);
  return n > RATE_LIMIT;
}

// 签发一次性授权码（已登录用户，Bearer JWT 由中间件保证）
async function issueCode(redisClient, { userId, clientId, redirectUri }) {
  const code = crypto.randomBytes(32).toString('hex');
  const key = `oauth_code:${code}`;
  await redisClient.set(
    key,
    JSON.stringify({ userId: String(userId), clientId, redirectUri }),
    { EX: CODE_TTL }
  );
  return code;
}

// 用授权码换 access_token；code 一次性，用完即删
async function exchangeCode(redisClient, { code, clientId, clientSecret, redirectUri }) {
  const client = findClient(clientId);
  if (!verifyClientSecret(client, clientSecret)) {
    throw { status: 401, message: 'invalid_client' };
  }

  const key = `oauth_code:${code}`;
  const raw = await redisClient.get(key);
  if (!raw) {
    throw { status: 400, message: 'invalid_grant' };
  }
  const record = JSON.parse(raw);
  if (record.clientId !== clientId || record.redirectUri !== redirectUri) {
    throw { status: 400, message: 'invalid_grant' };
  }
  // 用过即删（先取后删，失败也不留可重放的码）
  await redisClient.del(key);

  const accessToken = crypto.randomBytes(32).toString('hex');
  await redisClient.set(`oauth_token:${accessToken}`, String(record.userId), { EX: TOKEN_TTL });

  return { access_token: accessToken, token_type: 'Bearer', expires_in: TOKEN_TTL };
}

// userinfo：按 token 找用户，邮箱只从库读
async function getUserinfo(redisClient, accessToken) {
  const userId = await redisClient.get(`oauth_token:${accessToken}`);
  if (!userId) {
    throw { status: 401, message: 'invalid_token' };
  }
  const user = await User.findById(userId);
  if (!user) {
    throw { status: 401, message: 'invalid_token' };
  }
  return buildUserinfo(user);
}

// 用户名规则（方案 §6）：昵称（去空白）→ 邮箱前缀 → lotus_+_id 后 8 位
function pickUsername(user) {
  const nickname = (user.nickname || '').trim();
  if (nickname) return nickname;
  const prefix = (user.email || '').split('@')[0].trim();
  if (prefix) return prefix;
  return `lotus_${String(user._id).slice(-8)}`;
}

function buildUserinfo(user) {
  return {
    id: String(user._id),
    email: (user.email || '').trim().toLowerCase(),
    email_verified: true,
    username: pickUsername(user),
    name: (user.nickname || '').trim() || pickUsername(user),
  };
}

module.exports = {
  validateClient,
  verifyClientSecret,
  findClient,
  hitRateLimit,
  issueCode,
  exchangeCode,
  getUserinfo,
  pickUsername,
  buildUserinfo,
};
