const crypto = require('crypto');
const config = require('../config.json');
const User = require('../models/User');
const { pickUsername } = require('./oauthService');

// 影院 HMAC 跳转签发（方案 §5.2）
// 密钥在 config.json 的 sso.mediacmsSecret（gitignore，与社区 OAuth client_secret 分开）

function getSecret() {
  return (config.sso && config.sso.mediacmsSecret) || '';
}

function allowedHosts() {
  return (config.sso && config.sso.allowedReturnHosts) || [];
}

function hmac(message) {
  return crypto.createHmac('sha256', getSecret()).update(message).digest('hex');
}

// 验发起端签名：sig = HMAC("nonce={nonce}&return={return}")
// return 的 host 必须在白名单（config.sso.allowedReturnHosts），防打开重定向
function verifyRequest({ nonce, returnUrl, sig }) {
  if (!nonce || !returnUrl || !sig || !getSecret()) {
    throw { status: 400, message: '参数不完整' };
  }
  let host;
  try {
    host = new URL(returnUrl).host;
  } catch {
    throw { status: 400, message: 'return 不是合法 URL' };
  }
  if (!allowedHosts().includes(host)) {
    throw { status: 400, message: 'return 不在白名单' };
  }
  const expected = hmac(`nonce=${nonce}&return=${returnUrl}`);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw { status: 403, message: '签名不正确' };
  }
}

function base64url(str) {
  return Buffer.from(str, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 为当前登录用户签发影院跳转 URL；邮箱只从库读
async function issueMediacmsRedirect({ nonce, returnUrl, userId }) {
  const user = await User.findById(userId);
  if (!user) {
    throw { status: 401, message: '用户不存在' };
  }
  const payload = [
    `nonce=${nonce}`,
    `email=${(user.email || '').trim().toLowerCase()}`,
    `external_id=${String(user._id)}`,
    `username=${pickUsername(user)}`,
    `name=${(user.nickname || '').trim() || pickUsername(user)}`,
    'require_activation=false',
  ].join('\n');

  const sso = base64url(payload);
  const sig = hmac(sso);
  const sep = returnUrl.includes('?') ? '&' : '?';
  return { redirect: `${returnUrl}${sep}sso=${encodeURIComponent(sso)}&sig=${sig}` };
}

module.exports = { verifyRequest, issueMediacmsRedirect, issueChatAssertion };

// ---- 蓝莲花 chat：HMAC 断言（方案 §5.3，F 阶段） ----
// payload 行：ts / nonce / email / external_id / nickname；sig = HMAC(assertion)。
// 影院密钥与 chat 密钥分开（config.sso.chatSecret）。

function getChatSecret() {
  return (config.sso && config.sso.chatSecret) || '';
}

// 为当前登录用户签发 chat 断言；邮箱只从库读。有效期 5 分钟（ts 窗口由 chat 侧验）。
async function issueChatAssertion({ userId }) {
  if (!getChatSecret()) {
    throw { status: 503, message: 'chat SSO 未启用' };
  }
  const user = await User.findById(userId);
  if (!user) {
    throw { status: 401, message: '用户不存在' };
  }
  const payload = [
    `ts=${Math.floor(Date.now() / 1000)}`,
    `nonce=${crypto.randomBytes(32).toString('hex')}`,
    `email=${(user.email || '').trim().toLowerCase()}`,
    `external_id=${String(user._id)}`,
    `nickname=${(user.nickname || '').trim() || pickUsername(user)}`,
  ].join('\n');
  const assertion = base64url(payload);
  const sig = crypto.createHmac('sha256', getChatSecret()).update(assertion).digest('hex');
  return { assertion, sig };
}
