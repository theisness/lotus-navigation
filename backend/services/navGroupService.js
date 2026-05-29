const NavGroup = require('../models/NavGroup');
const NavItem = require('../models/NavItem');

async function getNavGroups() {
  const groups = await NavGroup.find().sort({ order: 1 });
  const items = await NavItem.find({ nav_group_id: { $ne: null } });
  const countMap = {};
  items.forEach(item => {
    const gid = item.nav_group_id.toString();
    countMap[gid] = (countMap[gid] || 0) + 1;
  });
  return groups.map(g => ({
    _id: g._id,
    title: g.title,
    order: g.order,
    itemCount: countMap[g._id.toString()] || 0,
  }));
}

async function createNavGroup(title) {
  const maxOrder = await NavGroup.findOne().sort({ order: -1 });
  const order = maxOrder ? maxOrder.order + 1 : 0;
  return NavGroup.create({ title, order });
}

async function updateNavGroup(id, { title }) {
  return NavGroup.findByIdAndUpdate(id, { title }, { new: true });
}

async function deleteNavGroup(id) {
  await NavItem.updateMany({ nav_group_id: id }, { nav_group_id: null });
  await NavGroup.findByIdAndDelete(id);
  return { message: '删除成功' };
}

async function reorderNavGroups(orders) {
  const ops = orders.map(({ id, order }) => ({
    updateOne: { filter: { _id: id }, update: { $set: { order } } },
  }));
  await NavGroup.bulkWrite(ops);
  return { message: '排序成功' };
}

async function setItemGroup(itemId, { nav_group_id }) {
  return NavItem.findByIdAndUpdate(itemId, { nav_group_id: nav_group_id || null }, { new: true });
}

module.exports = { getNavGroups, createNavGroup, updateNavGroup, deleteNavGroup, reorderNavGroups, setItemGroup };