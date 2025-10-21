const express = require('express');
const router = express.Router();
const newProjectController = require('../controllers/newProjectController');
const { auth, managerAuth } = require('../middleware/auth');

// 所有项目路由都需要认证
router.use(auth);

// 获取项目统计信息
router.get('/stats/overview', newProjectController.getProjectStats);

// 获取所有项目（合并显示）
router.get('/', newProjectController.getAllProjects);

// 获取单个项目（支持从待审批或已批准集合中查找）
router.get('/:id', newProjectController.getProjectById);

// 获取待审批项目
router.get('/pending', newProjectController.getPendingProjects);

// 获取已批准项目
router.get('/approved', newProjectController.getApprovedProjects);

// 创建项目（立项申请）- 所有认证用户都可以
router.post('/', newProjectController.createProject);

// 审批项目 - 需要管理员权限
router.put('/:id/approve', managerAuth, newProjectController.approveProject);

// 更新项目
router.put('/:id', newProjectController.updateProject);

// 删除项目
router.delete('/:id', newProjectController.deleteProject);

// 设置项目时间周期（主负责人专用）
const projectController = require('../controllers/projectController');
router.post('/timelines/set', projectController.setProjectTimelines);

// 更新项目时间完成状态
router.post('/timelines/update-status', projectController.updateTimelineStatus);

// 团队成员上传图纸（普通研发人员）
router.post('/team-member-upload', newProjectController.uploadTeamMemberFiles);

// 更新团队成员上传状态（主负责人整合后）
router.post('/update-team-member-status', newProjectController.updateTeamMemberUploadStatus);

// 工程师团队成员上传图纸（普通工程师）
router.post('/team-member-engineering-upload', newProjectController.uploadTeamMemberEngineeringFiles);

// 更新工程师团队成员上传状态（主负责人整合后）
router.post('/update-team-member-engineering-status', newProjectController.updateTeamMemberEngineeringUploadStatus);

module.exports = router;

