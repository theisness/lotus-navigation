const adminService = require('../services/adminService');

// GET /api/admin/members
async function getMembers(req, res) {
  try {
    const list = await adminService.getMembers();
    res.json(list);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// GET /api/admin/members/:id
async function getMemberById(req, res) {
  try {
    const member = await adminService.getMemberById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(member);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// PUT /api/admin/members/:id
async function updateMember(req, res) {
  try {
    const { is_admin } = req.body;
    const member = await adminService.updateMember(
      req.params.id,
      { is_admin },
      req.user.userId
    );
    res.json(member);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// DELETE /api/admin/members/:id
async function deleteMember(req, res) {
  try {
    await adminService.deleteMember(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// GET /api/admin/groups
async function getGroups(req, res) {
  try {
    const list = await adminService.getGroups();
    res.json(list);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// POST /api/admin/groups
async function createGroup(req, res) {
  try {
    const { name } = req.body;
    const group = await adminService.createGroup(name);
    res.status(201).json(group);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// PUT /api/admin/groups/:id
async function updateGroup(req, res) {
  try {
    const { name } = req.body;
    const group = await adminService.updateGroup(req.params.id, name);
    res.json(group);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// DELETE /api/admin/groups/:id
async function deleteGroup(req, res) {
  try {
    await adminService.deleteGroup(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// GET /api/admin/users/:userId/groups
async function getUserGroups(req, res) {
  try {
    const groups = await adminService.getUserGroups(req.params.userId);
    res.json(groups);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// PUT /api/admin/users/:userId/groups
async function setUserGroups(req, res) {
  try {
    const { groupIds } = req.body;
    const groups = await adminService.setUserGroups(req.params.userId, groupIds);
    res.json(groups);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

module.exports = {
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getUserGroups,
  setUserGroups,
};
