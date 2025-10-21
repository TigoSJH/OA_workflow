const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// 公开路由（不需要认证）
// 仅保留短信登录入口（仍保留原路由以兼容，但前端将不再使用账号密码）
router.post('/login', authController.login); // 兼容保留（前端将停用）
router.post('/register', authController.register); // 兼容保留（前端将停用）

// 短信相关
router.post('/send-sms-code', authController.sendSmsCode);
router.post('/login-sms', authController.loginWithSms);
router.post('/register-sms', authController.registerWithSms);

// 受保护路由（需要认证）
router.get('/me', auth, authController.getCurrentUser);
router.put('/change-password', auth, authController.changePassword);
router.post('/logout', auth, authController.logout);

module.exports = router;

