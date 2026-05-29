const express = require('express');
const router = express.Router();
const navItemController = require('../controllers/navItemController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

// GET /api/nav-items - 获取导航列表（可选登录）
router.get('/', optionalAuthMiddleware, navItemController.getNavItems);

// POST /api/nav-items - 添加导航项（需登录）
router.post('/', authMiddleware, navItemController.createNavItem);

// DELETE /api/nav-items/:id - 删除导航项（需登录）
router.delete('/:id', authMiddleware, navItemController.deleteNavItem);

// PUT /api/nav-items/:id - 编辑导航项（需登录）
router.put('/reorder', authMiddleware, navItemController.reorderNavItems);

router.put('/:id', authMiddleware, navItemController.updateNavItem);
router.put('/:id/group', authMiddleware, navItemController.setItemGroup);

module.exports = router;
