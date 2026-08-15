const oauthService = require('../services/oauthService');

// POST /api/oauth/authorize - 已登录用户签发授权码（Bearer JWT 由 authMiddleware 保证）
async function authorize(req, res) {
  try {
    const { client_id, redirect_uri, response_type, state } = req.body;
    if (!client_id || !redirect_uri || response_type !== 'code') {
      return res.status(400).json({ error: '参数不完整或 response_type 只支持 code' });
    }
    if (!oauthService.validateClient(client_id, redirect_uri)) {
      return res.status(400).json({ error: '客户端未登记或 redirect_uri 不匹配' });
    }
    const redisClient = req.app.locals.redisClient;
    if (await oauthService.hitRateLimit(redisClient, `authz:${client_id}`)) {
      return res.status(429).json({ error: '请求过于频繁' });
    }
    const code = await oauthService.issueCode(redisClient, {
      userId: req.user.userId,
      clientId: client_id,
      redirectUri: redirect_uri,
    });
    const sep = redirect_uri.includes('?') ? '&' : '?';
    let redirect = `${redirect_uri}${sep}code=${code}`;
    if (state !== undefined) redirect += `&state=${encodeURIComponent(state)}`;
    console.log(`[oauth] authorize ok userId=${req.user.userId} email=${req.user.email} client=${client_id}`);
    res.json({ redirect });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// POST /api/oauth/token - Discourse 服务器换 token（无浏览器 Cookie，验 client_secret）
async function token(req, res) {
  const redisClient = req.app.locals.redisClient;
  try {
    const { grant_type, code, redirect_uri } = req.body;
    // client_id/client_secret 走 body 或 HTTP Basic，两种都认
    let { client_id, client_secret } = req.body;
    const authHeader = req.headers.authorization || '';
    if ((!client_id || !client_secret) && authHeader.startsWith('Basic ')) {
      const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
      const idx = decoded.indexOf(':');
      if (idx > -1) {
        client_id = decodeURIComponent(decoded.slice(0, idx));
        client_secret = decodeURIComponent(decoded.slice(idx + 1));
      }
    }
    if (grant_type !== 'authorization_code' || !code || !redirect_uri || !client_id) {
      return res.status(400).json({ error: 'invalid_request' });
    }
    if (await oauthService.hitRateLimit(redisClient, `token:${client_id}`)) {
      return res.status(429).json({ error: 'too_many_requests' });
    }
    const result = await oauthService.exchangeCode(redisClient, {
      code,
      clientId: client_id,
      clientSecret: client_secret,
      redirectUri: redirect_uri,
    });
    console.log(`[oauth] token ok client=${client_id}`);
    res.json(result);
  } catch (err) {
    console.log(`[oauth] token fail: ${err.message || err}`);
    res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
}

// GET /api/oauth/userinfo - Bearer access_token（Discourse 服务器调用）
async function userinfo(req, res) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'invalid_token' });
    }
    const redisClient = req.app.locals.redisClient;
    const info = await oauthService.getUserinfo(redisClient, authHeader.slice(7));
    console.log(`[oauth] userinfo ok id=${info.id} email=${info.email}`);
    res.json(info);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'server_error' });
  }
}

module.exports = { authorize, token, userinfo };
