// 导航 SSO 全链路冒烟（一次性脚本，不进 git 提交也行）：
// 起内存 mongo/redis → 起 app → 直接往 redis 塞验证码注册测试用户 →
// OAuth authorize→token→userinfo 全流程 + 影院 HMAC 签发验签往返。
const { MongoMemoryServer } = require('mongodb-memory-server');
const { RedisMemoryServer } = require('redis-memory-server');
const crypto = require('crypto');
const { spawn } = require('child_process');

const HMAC_SECRET = 'dev-mediacms-hmac-local-only';
const OAUTH_SECRET = 'dev-oauth-secret-local-only';

async function main() {
  const mongo = await MongoMemoryServer.create({ instance: { port: 27017, dbName: 'nav_portal' } });
  console.log('mongo up:', mongo.getUri());
  const redis = await RedisMemoryServer.create({ instance: { port: 6379 } });
  console.log('redis up:', await redis.getPort());
  // 后端 config 要求 redis 密码 destiny-analysis-2048；redis-memory-server 默认无密码。
  // 简化：直接改内存配置？不可行。改用临时 config 环境——app.js 只读 config.json。
  // 这里用 requirecache 预置：先加载 config.json 再改字段，然后 spawn 子进程会重读文件。
  // 故改为：临时把 config.json 的 redis.password 置空再还原。
  const fs = require('fs');
  const cfgPath = './config.json';
  const orig = fs.readFileSync(cfgPath, 'utf8');
  const cfg = JSON.parse(orig);
  cfg.redis.password = '';
  cfg.redis.username = '';
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

  const app = spawn('node', ['app.js'], { stdio: ['ignore', 'pipe', 'inherit'] });
  const cleanup = async (code) => {
    fs.writeFileSync(cfgPath, orig);
    app.kill();
    await mongo.stop(); await redis.stop();
    process.exit(code);
  };
  process.on('SIGINT', () => cleanup(1));

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('app 启动超时')), 30000);
    app.stdout.on('data', (d) => {
      if (d.toString().includes('服务器运行')) { clearTimeout(t); resolve(); }
    });
  });
  console.log('app up');

  const base = 'http://localhost:3001';
  const j = (r) => r.json();
  const post = (p, body, token) =>
    fetch(base + p, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });

  // 直接往 redis 塞验证码，注册+登录测试用户（绕过真实发邮件）
  const { createClient } = require('redis');
  const rc = createClient({ socket: { host: 'localhost', port: 6379 } });
  await rc.connect();
  await rc.set('verify_code:sso-e2e@lotus.dev', '123456');
  const email = 'sso-e2e@lotus.dev';
  let r = await post('/api/auth/register', { email, password: 'Passw0rd!', code: '123456' });
  if (r.status !== 201) throw new Error('注册失败 ' + r.status + ' ' + JSON.stringify(await j(r)));
  r = await post('/api/auth/login', { email, password: 'Passw0rd!' });
  const { token: jwt } = await j(r);
  console.log('register+login ok');

  // --- 站点开通闸（siteAccessService）：插三张非公开卡 + 授权组 G；主号入组，二号无组应全 403 ---
  const mongoose = require('mongoose');
  await mongoose.connect('mongodb://localhost:27017/nav_portal');
  const db = mongoose.connection.db;
  const me = await db.collection('users').findOne({ email });
  const gid = new mongoose.Types.ObjectId();
  await db.collection('groups').insertOne({ _id: gid, name: 'smoke-group', created_at: new Date() });
  await db.collection('usergroups').insertOne({ user_id: me._id, group_id: gid });
  const mkCard = (url) => ({
    url, title: '卡-' + url, display_mode: 'iframe', is_public: false,
    user_id: null, visible_group_ids: [gid], sort_order: 0, created_at: new Date(),
  });
  await db.collection('navitems').insertMany([
    mkCard('http://127.0.0.1:8090/'),                 // 对应 dev OAuth client redirect host
    mkCard('https://cinema.example.invalid/'),        // 对应 mediacms returnUrl host
    mkCard('https://chat.dev.invalid/'),              // 对应 dev config sso.chatSiteHost
  ]);
  console.log('access cards seeded');

  // 二号（无组，未开通任何站）
  await rc.set('verify_code:sso-noaccess@lotus.dev', '123456');
  r = await post('/api/auth/register', { email: 'sso-noaccess@lotus.dev', password: 'Passw0rd!', code: '123456' });
  if (r.status !== 201) throw new Error('二号注册失败 ' + r.status);
  r = await post('/api/auth/login', { email: 'sso-noaccess@lotus.dev', password: 'Passw0rd!' });
  const { token: jwt2 } = await j(r);
  console.log('no-access user ok');

  // --- OAuth: authorize ---
  r = await post('/api/oauth/authorize', {
    client_id: 'discourse-dev',
    redirect_uri: 'http://127.0.0.1:8090/auth/oauth2_basic/callback',
    response_type: 'code',
    state: 'xyz',
  }, jwt);
  const { redirect } = await j(r);
  const code = new URL(redirect).searchParams.get('code');
  if (new URL(redirect).searchParams.get('state') !== 'xyz') throw new Error('state 未原样回传');
  console.log('authorize ok, code len', code.length);

  // --- OAuth: token（表单提交 + Basic 两种都验）---
  r = await fetch(base + '/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code,
      redirect_uri: 'http://127.0.0.1:8090/auth/oauth2_basic/callback',
      client_id: 'discourse-dev', client_secret: OAUTH_SECRET,
    }),
  });
  const tk = await j(r);
  if (!tk.access_token) throw new Error('token 失败 ' + JSON.stringify(tk));
  console.log('token ok');

  // code 重放必须失败
  r = await fetch(base + '/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code,
      redirect_uri: 'http://127.0.0.1:8090/auth/oauth2_basic/callback',
      client_id: 'discourse-dev', client_secret: OAUTH_SECRET,
    }),
  });
  if (r.status === 200) throw new Error('code 重放居然成功');
  console.log('code replay rejected:', r.status);

  // 错误 secret 必须 401
  r = await fetch(base + '/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code: 'x',
      redirect_uri: 'http://127.0.0.1:8090/auth/oauth2_basic/callback',
      client_id: 'discourse-dev', client_secret: 'wrong',
    }),
  });
  if (r.status !== 401) throw new Error('错误 secret 应 401，实得 ' + r.status);
  console.log('bad secret rejected: 401');

  // --- OAuth: userinfo ---
  r = await fetch(base + '/api/oauth/userinfo', { headers: { Authorization: `Bearer ${tk.access_token}` } });
  const info = await j(r);
  if (info.email !== email || info.email_verified !== true || !info.id || !info.username) throw new Error('userinfo 不对 ' + JSON.stringify(info));
  console.log('userinfo ok:', JSON.stringify(info));

  // --- 影院 HMAC：模拟影院发起签名 → 调签发 → 按影院回调逻辑验签解 payload ---
  // returnUrl 的 host 必须在 dev config 的 sso.allowedReturnHosts 里；可用 SMOKE_RETURN_URL 覆盖
  const nonce = crypto.randomBytes(32).toString('hex');
  const returnUrl = process.env.SMOKE_RETURN_URL || 'https://cinema.example.invalid/accounts/lotus-sso/callback/';
  const sig = crypto.createHmac('sha256', HMAC_SECRET).update(`nonce=${nonce}&return=${returnUrl}`).digest('hex');
  r = await post('/api/auth/sso/mediacms', { nonce, return: returnUrl, sig }, jwt);
  const { redirect: mRedirect } = await j(r);
  const mu = new URL(mRedirect);
  const sso = mu.searchParams.get('sso');
  const msig = mu.searchParams.get('sig');
  const expectSig = crypto.createHmac('sha256', HMAC_SECRET).update(sso).digest('hex');
  if (msig !== expectSig) throw new Error('影院回跳 sig 验不过');
  const payload = Buffer.from(sso.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
  const fields = Object.fromEntries(payload.split('\n').map((l) => l.split('=')));
  if (fields.email !== email || fields.nonce !== nonce) throw new Error('payload 不对 ' + payload);
  console.log('mediacms hmac roundtrip ok:', payload.split('\n').slice(0, 3).join(' | '));

  // 伪造 sig 必须 403
  r = await post('/api/auth/sso/mediacms', { nonce, return: returnUrl, sig: '0'.repeat(64) }, jwt);
  if (r.status !== 403) throw new Error('伪造 sig 应 403，实得 ' + r.status);
  console.log('forged sig rejected: 403');

  // 未登录调 authorize 必须 401
  r = await post('/api/oauth/authorize', { client_id: 'discourse-dev', redirect_uri: 'http://127.0.0.1:8090/auth/oauth2_basic/callback', response_type: 'code' });
  if (r.status !== 401) throw new Error('未登录应 401，实得 ' + r.status);
  console.log('unauth authorize rejected: 401');

  // --- chat 断言正例（主号有组）---
  r = await post('/api/auth/sso/chat', {}, jwt);
  const chatData = await j(r);
  if (!chatData.assertion || !chatData.sig) throw new Error('chat 断言缺失 ' + JSON.stringify(chatData));
  const chatSecret = JSON.parse(fs.readFileSync(cfgPath, 'utf8')).sso.chatSecret;
  const expectChatSig = crypto.createHmac('sha256', chatSecret).update(chatData.assertion).digest('hex');
  if (chatData.sig !== expectChatSig) throw new Error('chat 断言 sig 验不过');
  console.log('chat assertion ok');

  // --- 站点开通闸负例：二号（无组）三端必须 403 ---
  r = await post('/api/oauth/authorize', { client_id: 'discourse-dev', redirect_uri: 'http://127.0.0.1:8090/auth/oauth2_basic/callback', response_type: 'code' }, jwt2);
  if (r.status !== 403) throw new Error('未开通 authorize 应 403，实得 ' + r.status + ' ' + JSON.stringify(await j(r)));
  r = await post('/api/auth/sso/mediacms', { nonce, return: returnUrl, sig }, jwt2);
  if (r.status !== 403) throw new Error('未开通 mediacms 应 403，实得 ' + r.status);
  r = await post('/api/auth/sso/chat', {}, jwt2);
  if (r.status !== 403) throw new Error('未开通 chat 应 403，实得 ' + r.status);
  const denyMsg = JSON.stringify(await j(r));
  if (!denyMsg.includes('尚未开通')) throw new Error('拒绝文案不对 ' + denyMsg);
  console.log('access gate: 未开通三端全 403（含中文文案）');

  console.log('ALL_SMOKE_OK');
  await cleanup(0);
}

main().catch((e) => { console.error('SMOKE_FAIL:', e.message); process.exit(1); });
