const User = require('../models/User');
const Group = require('../models/Group');
const UserGroup = require('../models/UserGroup');
const NavItem = require('../models/NavItem');

// 获取成员列表（含分组信息）
async function getMembers() {
  const users = await User.find().select('-password').sort({ created_at: -1 }).lean();
  const userIds = users.map((u) => u._id);
  const userGroups = await UserGroup.find({ user_id: { $in: userIds } })
    .populate('group_id', 'name')
    .lean();

  const groupMap = {};
  userGroups.forEach((ug) => {
    const uid = ug.user_id.toString();
    if (!groupMap[uid]) groupMap[uid] = [];
    if (ug.group_id) groupMap[uid].push(ug.group_id);
  });

  return users.map((u) => ({
    ...u,
    id: u._id,
    groups: groupMap[u._id.toString()] || [],
  }));
}

// 获取单个成员详情
async function getMemberById(id) {
  const user = await User.findById(id).select('-password').lean();
  if (!user) return null;
  const groups = await UserGroup.find({ user_id: id }).populate('group_id', 'name').lean();
  return {
    ...user,
    id: user._id,
    groups: groups.map((ug) => ug.group_id).filter(Boolean),
  };
}

// 删除成员（同时删除其 UserGroup、其创建的私有 NavItem）
async function deleteMember(id) {
  const user = await User.findById(id);
  if (!user) {
    throw { status: 404, message: '用户不存在' };
  }
  await UserGroup.deleteMany({ user_id: id });
  await NavItem.deleteMany({ user_id: id });
  await User.findByIdAndDelete(id);
  return { message: '删除成功' };
}

// 分组 CRUD
async function getGroups() {
  return Group.find().sort({ created_at: -1 }).lean();
}

async function createGroup(name) {
  if (!name || !String(name).trim()) {
    throw { status: 400, message: '分组名称不能为空' };
  }
  const group = await Group.create({ name: String(name).trim() });
  return group;
}

async function updateGroup(id, name) {
  if (!name || !String(name).trim()) {
    throw { status: 400, message: '分组名称不能为空' };
  }
  const group = await Group.findByIdAndUpdate(id, { name: String(name).trim() }, { new: true });
  if (!group) {
    throw { status: 404, message: '分组不存在' };
  }
  return group;
}

async function deleteGroup(id) {
  const group = await Group.findById(id);
  if (!group) {
    throw { status: 404, message: '分组不存在' };
  }
  await UserGroup.deleteMany({ group_id: id });
  await Group.findByIdAndDelete(id);
  return { message: '删除成功' };
}

// 获取用户所属分组
async function getUserGroups(userId) {
  const list = await UserGroup.find({ user_id: userId }).populate('group_id', 'name').lean();
  return list.map((ug) => ug.group_id).filter(Boolean);
}

// 设置用户所属分组（覆盖）
async function setUserGroups(userId, groupIds) {
  const user = await User.findById(userId);
  if (!user) {
    throw { status: 404, message: '用户不存在' };
  }
  const ids = Array.isArray(groupIds) ? groupIds : [];
  await UserGroup.deleteMany({ user_id: userId });
  if (ids.length > 0) {
    await UserGroup.insertMany(ids.map((gid) => ({ user_id: userId, group_id: gid })));
  }
  return getUserGroups(userId);
}

module.exports = {
  getMembers,
  getMemberById,
  deleteMember,
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getUserGroups,
  setUserGroups,
};
