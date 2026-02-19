const NavItem = require('../models/NavItem');

// 获取导航项列表
async function getNavItems(userId) {
  if (userId) {
    // 已登录：公共项 + 该用户私有项
    return NavItem.find({
      $or: [{ is_public: true }, { user_id: userId }],
    }).sort({ created_at: -1 });
  }
  // 未登录：仅公共项
  return NavItem.find({ is_public: true }).sort({ created_at: -1 });
}

// 创建导航项
async function createNavItem(data, user) {
  // 普通用户不能创建公共项
  if (data.is_public && !user.is_admin) {
    throw { status: 403, message: '权限不足' };
  }

  const navItem = await NavItem.create({
    url: data.url,
    title: data.title,
    description: data.description || '',
    emoji: data.emoji || '🔗',
    display_mode: data.display_mode,
    is_public: data.is_public || false,
    user_id: data.is_public ? null : user.userId,
    bg_image: data.bg_image || '',
  });

  return navItem;
}

// 删除导航项
async function deleteNavItem(itemId, user) {
  const navItem = await NavItem.findById(itemId);
  if (!navItem) {
    throw { status: 404, message: '导航项不存在' };
  }

  // 管理员可删除公共项，用户只能删除自己的私有项
  const isOwner = navItem.user_id && navItem.user_id.toString() === user.userId;
  const isAdminDeletingPublic = user.is_admin && navItem.is_public;

  if (!isOwner && !isAdminDeletingPublic) {
    throw { status: 403, message: '权限不足' };
  }

  await NavItem.findByIdAndDelete(itemId);
  return { message: '删除成功' };
}

module.exports = { getNavItems, createNavItem, deleteNavItem };
