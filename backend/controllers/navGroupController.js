const navGroupService = require('../services/navGroupService');

async function getNavGroups(req, res) {
  try {
    const groups = await navGroupService.getNavGroups();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createNavGroup(req, res) {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: '标题不能为空' });
    const group = await navGroupService.createNavGroup(title.trim());
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateNavGroup(req, res) {
  try {
    const { title } = req.body;
    const group = await navGroupService.updateNavGroup(req.params.id, { title });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteNavGroup(req, res) {
  try {
    await navGroupService.deleteNavGroup(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function reorderNavGroups(req, res) {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) return res.status(400).json({ error: '参数错误' });
    await navGroupService.reorderNavGroups(orders);
    res.json({ message: '排序成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function setItemGroup(req, res) {
  try {
    const { nav_group_id } = req.body;
    const item = await navGroupService.setItemGroup(req.params.id, { nav_group_id });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getNavGroups, createNavGroup, updateNavGroup, deleteNavGroup, reorderNavGroups, setItemGroup };