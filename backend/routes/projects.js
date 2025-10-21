const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const newProjectController = require('../controllers/newProjectController');
const { auth, adminAuth } = require('../middleware/auth');

// 所有项目路由都需要认证
router.use(auth);

// 获取项目统计信息
router.get('/stats/overview', projectController.getProjectStats);

// 获取所有项目
router.get('/', projectController.getProjects);

// 获取单个项目
router.get('/:id', projectController.getProject);

// 创建项目（立项申请）- 所有认证用户都可以
router.post('/', projectController.createProject);

// 审批项目 - 需要管理员权限
router.put('/:id/approve', adminAuth, projectController.approveProject);

// 更新项目
router.put('/:id', projectController.updateProject);

// 删除项目
router.delete('/:id', projectController.deleteProject);

// 设置项目时间周期（主负责人专用）
router.post('/timelines/set', projectController.setProjectTimelines);

// 更新项目时间完成状态
router.post('/timelines/update-status', projectController.updateTimelineStatus);

// 团队成员上传文件
router.post('/team-member-upload', newProjectController.uploadTeamMemberFiles);

// 更新团队成员上传状态
router.post('/update-team-member-status', newProjectController.updateTeamMemberUploadStatus);

module.exports = router;
