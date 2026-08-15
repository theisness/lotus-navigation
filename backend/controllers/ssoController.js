const ssoService = require('../services/ssoService');
const siteAccess = require('../services/siteAccessService');

// POST /api/auth/sso/mediacms - 影院 HMAC 跳转签发（Bearer JWT 由 authMiddleware 保证）
async function mediacms(req, res) {
  try {
    const { nonce, return: returnUrl, sig } = req.body;
    ssoService.verifyRequest({ nonce, returnUrl, sig });
    // 站点开通闸：returnUrl 已过白名单，其 host 即影院
    const access = await siteAccess.canAccessHost(req.user.userId, new URL(returnUrl).host);
    if (!access.ok) throw siteAccess.deniedError(access.siteTitle);
    const result = await ssoService.issueMediacmsRedirect({
      nonce,
      returnUrl,
      userId: req.user.userId,
    });
    console.log(`[sso] mediacms ok userId=${req.user.userId} email=${req.user.email}`);
    res.json(result);
  } catch (err) {
    console.log(`[sso] mediacms fail userId=${req.user && req.user.userId}: ${err.message || err}`);
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// POST /api/auth/sso/chat - 蓝莲花 chat HMAC 断言签发（需登录）
async function chat(req, res) {
  try {
    // 站点开通闸：chat 无 return 参数，目标 host 取服务端配置
    const access = await siteAccess.canAccessHost(req.user.userId, ssoService.chatSiteHost());
    if (!access.ok) throw siteAccess.deniedError(access.siteTitle);
    const result = await ssoService.issueChatAssertion({ userId: req.user.userId });
    console.log(`[sso] chat ok userId=${req.user.userId} email=${req.user.email}`);
    res.json(result);
  } catch (err) {
    console.log(`[sso] chat fail userId=${req.user && req.user.userId}: ${err.message || err}`);
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

module.exports = { mediacms, chat };
