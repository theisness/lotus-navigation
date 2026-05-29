const express = require('express');
const router = express.Router();
const controller = require('../controllers/navGroupController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', controller.getNavGroups);
router.post('/', authMiddleware, controller.createNavGroup);
router.put('/reorder', authMiddleware, controller.reorderNavGroups);
router.put('/:id', authMiddleware, controller.updateNavGroup);
router.delete('/:id', authMiddleware, controller.deleteNavGroup);

module.exports = router;