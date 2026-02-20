const NavItem = require('../models/NavItem');
const UserGroup = require('../models/UserGroup');

// 获取导航项列表
async function getNavItems(userId) {
  if (userId) {
    const userGroupIds = await UserGroup.find({ user_id: userId }).distinct('group_id');
    const conditions = [
      { is_public: true },
      { user_id: userId },
    ];
    if (userGroupIds.length > 0) {
      conditions.push({ visible_group_ids: { $in: userGroupIds } });
    }
    return NavItem.find({ $or: conditions }).sort({ created_at: -1 });
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

  const payload = {
    url: data.url,
    title: data.title,
    description: data.description || '',
    emoji: data.emoji || '🔗',
    display_mode: data.display_mode,
    is_public: data.is_public || false,
    user_id: user.userId,
    bg_image: data.bg_image || '',
    bg_position: data.bg_position || 'center',
  };
  if (user.is_admin && Array.isArray(data.visible_group_ids)) {
    payload.visible_group_ids = data.visible_group_ids;
  }
  const navItem = await NavItem.create(payload);
  return navItem;
}

// 编辑导航项
async function updateNavItem(itemId, data, user) {
  const navItem = await NavItem.findById(itemId);
  if (!navItem) {
    throw { status: 404, message: '导航项不存在' };
  }

  const isOwner = navItem.user_id && navItem.user_id.toString() === user.userId;

  if (!isOwner && !user.is_admin) {
    throw { status: 403, message: '权限不足' };
  }

  // 普通用户不能改为公共项
  if (data.is_public && !user.is_admin) {
    throw { status: 403, message: '权限不足' };
  }

  const allowed = ['url', 'title', 'description', 'emoji', 'display_mode', 'is_public', 'bg_image', 'bg_position'];
  if (user.is_admin) allowed.push('visible_group_ids');
  const update = {};
  for (const key of allowed) {
    if (data[key] !== undefined) update[key] = data[key];
  }

  const updated = await NavItem.findByIdAndUpdate(itemId, update, { new: true });
  return updated;
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

module.exports = { getNavItems, createNavItem, updateNavItem, deleteNavItem };
