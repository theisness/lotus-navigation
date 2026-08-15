const NavItem = require('../models/NavItem');
const UserGroup = require('../models/UserGroup');

// 「站点开通」判定（2026-08-15 user 拍板）：没给用户开通的网站不许 SSO 进入。
// 规则 = 首页卡片可见性（与 navItemService.getNavItems 一致）：
//   该 host 任一卡片 is_public / 用户自己的卡(user_id) / visible_group_ids ∩ 用户组。
// fail-closed：host 没登记任何卡片 → 拒。
// host 只从「服务端已验信」的来源取：OAuth client 登记的 redirect_uri /
// 影院验过白名单的 returnUrl / config.sso.chatSiteHost；绝不取客户端自报的 host。

function hostRegex(host) {
  const esc = String(host).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^https?://${esc}(/|$)`, 'i');
}

// 返回 { ok, siteTitle }；host 下有卡片时 siteTitle 取第一张卡的标题（用于中文报错）
async function canAccessHost(userId, host) {
  if (!userId || !host) return { ok: false, siteTitle: '' };
  const items = await NavItem.find({ url: hostRegex(host) })
    .select('title is_public user_id visible_group_ids')
    .sort({ sort_order: 1 })
    .lean();
  if (!items.length) return { ok: false, siteTitle: '' };
  const siteTitle = items[0].title || '';
  if (items.some((i) => i.is_public)) return { ok: true, siteTitle };
  if (items.some((i) => i.user_id && String(i.user_id) === String(userId))) {
    return { ok: true, siteTitle };
  }
  const gids = await UserGroup.find({ user_id: userId }).distinct('group_id');
  if (gids.length) {
    const gidSet = new Set(gids.map(String));
    if (items.some((i) => (i.visible_group_ids || []).some((g) => gidSet.has(String(g))))) {
      return { ok: true, siteTitle };
    }
  }
  return { ok: false, siteTitle };
}

function deniedError(siteTitle) {
  return { status: 403, message: `该账号尚未开通${siteTitle ? `「${siteTitle}」` : '此站点'}，请联系管理员开通` };
}

module.exports = { canAccessHost, deniedError };
