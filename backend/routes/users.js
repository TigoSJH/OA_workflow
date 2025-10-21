const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, adminAuth } = require('../middleware/auth');

// 所有用户路由都需要认证和管理员权限
router.use(auth);
router.use(adminAuth);

// 获取用户统计信息
router.get('/stats/overview', userController.getUserStats);

// 获取所有用户
router.get('/', userController.getAllUsers);

// 获取单个用户
router.get('/:id', userController.getUserById);

// 创建用户
router.post('/', userController.createUser);

// 更新用户信息
router.put('/:id', userController.updateUser);

// 批准用户
router.put('/:id/approve', userController.approveUser);

// 拒绝用户
router.put('/:id/reject', userController.rejectUser);

// 重置用户密码
router.put('/:id/reset-password', userController.resetPassword);

// 删除用户
router.delete('/:id', userController.deleteUser);

// 主负责人管理
router.get('/primary-leaders/list', userController.getPrimaryLeaders);
router.post('/primary-leaders/set', userController.setPrimaryLeader);
router.post('/primary-leaders/remove', userController.removePrimaryLeader);

module.exports = router;

