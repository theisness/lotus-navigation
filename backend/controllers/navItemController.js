const navItemService = require('../services/navItemService');

// GET /api/nav-items
async function getNavItems(req, res) {
  try {
    const userId = req.user ? req.user.userId : null;
    const items = await navItemService.getNavItems(userId);
    res.json(items);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// POST /api/nav-items
async function createNavItem(req, res) {
  try {
    const { url, title, description, emoji, display_mode, is_public, bg_image } = req.body;
    if (!url || !title) {
      const fields = [];
      if (!url) fields.push('url');
      if (!title) fields.push('title');
      return res.status(400).json({ error: '缺少必填字段', fields });
    }
    const item = await navItemService.createNavItem(
      { url, title, description, emoji, display_mode, is_public, bg_image },
      req.user
    );
    res.status(201).json(item);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// PUT /api/nav-items/:id
async function updateNavItem(req, res) {
  try {
    const item = await navItemService.updateNavItem(req.params.id, req.body, req.user);
    res.json(item);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

// DELETE /api/nav-items/:id
async function deleteNavItem(req, res) {
  try {
    const result = await navItemService.deleteNavItem(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  }
}

module.exports = { getNavItems, createNavItem, updateNavItem, deleteNavItem };
