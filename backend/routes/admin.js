const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminMiddleware);

// 成员
router.get('/members', adminController.getMembers);
router.get('/members/:id', adminController.getMemberById);
router.put('/members/:id', adminController.updateMember);
router.delete('/members/:id', adminController.deleteMember);

// 分组
router.get('/groups', adminController.getGroups);
router.post('/groups', adminController.createGroup);
router.put('/groups/:id', adminController.updateGroup);
router.delete('/groups/:id', adminController.deleteGroup);

// 用户-分组
router.get('/users/:userId/groups', adminController.getUserGroups);
router.put('/users/:userId/groups', adminController.setUserGroups);

module.exports = router;
