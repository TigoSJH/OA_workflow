const PendingProject = require('../models/PendingProject');
const ApprovedProject = require('../models/ApprovedProject');
const Notification = require('../models/Notification');
const User = require('../models/User');

// 获取所有待审批项目
exports.getPendingProjects = async (req, res) => {
  try {
    const { status, projectType, createdBy } = req.query;
    
    // 构建查询条件
    let query = {};
    if (status) query.status = status;
    if (projectType) query.projectType = projectType;
    if (createdBy) query.createdBy = createdBy;
    
    const projects = await PendingProject.find(query)
      .populate('createdBy', 'username displayName')
      .sort({ createTime: -1 });
    
    res.json({
      projects: projects.map(project => ({
        id: project._id,
        projectName: project.projectName,
        projectType: project.projectType,
        description: project.description,
        researchDirection: project.researchDirection,
        researchPurpose: project.researchPurpose,
        researchBudget: project.researchBudget,
        researchDuration: project.researchDuration,
        contractAmount: project.contractAmount,
        contractDuration: project.contractDuration,
        contractFile: project.contractFile,  // 合同文件名
        budget: project.budget,
        duration: project.duration,
        priority: project.priority,
        status: project.status,
        createdBy: project.createdBy,
        createdByName: project.createdByName,
        approvalProgress: project.approvalProgress, // 审批进度
        approvalRecords: project.approvalRecords, // 审批记录
        rejectedBy: project.rejectedBy,
        rejectedTime: project.rejectedTime,
        rejectedComment: project.rejectedComment,
        createTime: project.createTime,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }))
    });
  } catch (error) {
    console.error('获取待审批项目列表错误:', error);
    res.status(500).json({ error: '获取待审批项目列表失败' });
  }
};

// 获取所有已批准项目
exports.getApprovedProjects = async (req, res) => {
  try {
    const { status, projectType, createdBy } = req.query;
    
    // 构建查询条件
    let query = {};
    if (status) query.status = status;
    if (projectType) query.projectType = projectType;
    if (createdBy) query.createdBy = createdBy;
    
    const projects = await ApprovedProject.find(query)
      .populate('createdBy', 'username displayName')
      .sort({ approveTime: -1 });

    // 构建用户名到显示名的映射，用于把 *CompletedBy 字段从账号名映射为显示名
    let usernameToDisplayName = new Map();
    try {
      const users = await User.find({}, 'username displayName').lean();
      usernameToDisplayName = new Map(users.map(u => [u.username, u.displayName || u.username]));
    } catch {}
    
    res.json({
      projects: projects.map(project => ({
        id: project._id,
        projectName: project.projectName,
        projectType: project.projectType,
        description: project.description,
        researchDirection: project.researchDirection,
        researchPurpose: project.researchPurpose,
        researchBudget: project.researchBudget,
        researchDuration: project.researchDuration,
        contractAmount: project.contractAmount,
        contractDuration: project.contractDuration,
        contractFile: project.contractFile,  // 合同文件名
        budget: project.budget,
        duration: project.duration,
        priority: project.priority,
        status: project.status,
        createdBy: project.createdBy,
        createdByName: project.createdByName,
        approver: project.approver,
        approveTime: project.approveTime,
        approveComment: project.approveComment,
        // 关键：返回研发完成状态，供前端tab分类
        developmentCompleted: project.developmentCompleted,
        developmentCompletedTime: project.developmentCompletedTime,
        developmentCompletedBy: usernameToDisplayName.get(project.developmentCompletedBy) || project.developmentCompletedBy,
        // 返回图片元数据列表
        folderScreenshots: project.folderScreenshots,
        drawingImages: project.drawingImages,
        // 工程阶段字段
        engineeringCompleted: project.engineeringCompleted,
        engineeringCompletedTime: project.engineeringCompletedTime,
        engineeringCompletedBy: usernameToDisplayName.get(project.engineeringCompletedBy) || project.engineeringCompletedBy,
        engineeringDrawings: project.engineeringDrawings,
        engineeringDocuments: project.engineeringDocuments,
        // 采购阶段字段
        purchaseCompleted: project.purchaseCompleted,
        purchaseCompletedTime: project.purchaseCompletedTime,
        purchaseCompletedBy: usernameToDisplayName.get(project.purchaseCompletedBy) || project.purchaseCompletedBy,
        purchaseDocuments: project.purchaseDocuments,
        invoiceDocuments: project.invoiceDocuments,
        // 加工阶段字段
        processingCompleted: project.processingCompleted,
        processingCompletedTime: project.processingCompletedTime,
        processingCompletedBy: usernameToDisplayName.get(project.processingCompletedBy) || project.processingCompletedBy,
        processingImages: project.processingImages,
        // 装配阶段字段
        assemblyCompleted: project.assemblyCompleted,
        assemblyCompletedTime: project.assemblyCompletedTime,
        assemblyCompletedBy: usernameToDisplayName.get(project.assemblyCompletedBy) || project.assemblyCompletedBy,
        assemblyImages: project.assemblyImages,
        // 调试阶段
        testingCompleted: project.testingCompleted,
        testingCompletedTime: project.testingCompletedTime,
        testingCompletedBy: usernameToDisplayName.get(project.testingCompletedBy) || project.testingCompletedBy,
        // 入库阶段
        warehouseInCompleted: project.warehouseInCompleted,
        warehouseInCompletedTime: project.warehouseInCompletedTime,
        warehouseInCompletedBy: usernameToDisplayName.get(project.warehouseInCompletedBy) || project.warehouseInCompletedBy,
        // 第二次入库阶段（整机）
        warehouseInSecondCompleted: project.warehouseInSecondCompleted,
        warehouseInSecondCompletedTime: project.warehouseInSecondCompletedTime,
        warehouseInSecondCompletedBy: usernameToDisplayName.get(project.warehouseInSecondCompletedBy) || project.warehouseInSecondCompletedBy,
        // 出库阶段（第一次）
        warehouseOutCompleted: project.warehouseOutCompleted,
        warehouseOutCompletedTime: project.warehouseOutCompletedTime,
        warehouseOutCompletedBy: usernameToDisplayName.get(project.warehouseOutCompletedBy) || project.warehouseOutCompletedBy,
        // 第二次出库阶段（整机确认）
        warehouseOutSecondCompleted: project.warehouseOutSecondCompleted,
        warehouseOutSecondCompletedTime: project.warehouseOutSecondCompletedTime,
        warehouseOutSecondCompletedBy: usernameToDisplayName.get(project.warehouseOutSecondCompletedBy) || project.warehouseOutSecondCompletedBy,
        // 归档阶段
        archived: project.archived,
        archivedTime: project.archivedTime,
        archivedBy: usernameToDisplayName.get(project.archivedBy) || project.archivedBy,
        archiveSummary: project.archiveSummary,
        createTime: project.createTime,
        approvedDate: project.approvedDate,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        // 时间周期
        timeScheduleSet: project.timeScheduleSet,
        timelines: project.timelines,
        // 团队成员上传
        teamMemberUploads: project.teamMemberUploads,
        teamMemberEngineeringUploads: project.teamMemberEngineeringUploads,
        teamMemberPurchaseUploads: project.teamMemberPurchaseUploads,
        teamMemberProcessingUploads: project.teamMemberProcessingUploads,
        teamMemberAssemblyUploads: project.teamMemberAssemblyUploads
      }))
    });
  } catch (error) {
    console.error('获取已批准项目列表错误:', error);
    res.status(500).json({ error: '获取已批准项目列表失败' });
  }
};

// 获取单个项目（自动在 Pending 与 Approved 集合中查找）
exports.getProjectById = async (req, res) => {
  try {
    const projectId = req.params.id;

    // 构建用户名到显示名的映射
    let usernameToDisplayName = new Map();
    try {
      const users = await User.find({}, 'username displayName').lean();
      usernameToDisplayName = new Map(users.map(u => [u.username, u.displayName || u.username]));
    } catch {}

    // 先在待审批集合查找
    let project = await PendingProject.findById(projectId)
      .populate('createdBy', 'username displayName');
    let category = 'pending';

    // 若未找到，去已批准集合查找
    if (!project) {
      project = await ApprovedProject.findById(projectId)
        .populate('createdBy', 'username displayName');
      category = 'approved';
    }

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 统一返回结构
    const baseFields = {
      id: project._id,
      projectName: project.projectName,
      projectType: project.projectType,
      description: project.description,
      researchDirection: project.researchDirection,
      researchPurpose: project.researchPurpose,
      budget: project.budget,
      duration: project.duration,
      priority: project.priority,
      status: project.status,
      createdBy: project.createdBy,
      createdByName: project.createdByName,
      createTime: project.createTime,
      category
    };

    if (category === 'pending') {
      return res.json({ project: {
        ...baseFields,
        approvalProgress: project.approvalProgress,
        approvalRecords: project.approvalRecords,
        rejectedBy: project.rejectedBy,
        rejectedTime: project.rejectedTime,
        rejectedComment: project.rejectedComment
      }});
    }

    // category === 'approved'
    return res.json({ project: {
      ...baseFields,
      approver: project.approver,
      approveTime: project.approveTime,
      approveComment: project.approveComment,
      // 研发阶段
      developmentCompleted: project.developmentCompleted,
      developmentCompletedTime: project.developmentCompletedTime,
      developmentCompletedBy: usernameToDisplayName.get(project.developmentCompletedBy) || project.developmentCompletedBy,
      folderScreenshots: project.folderScreenshots,
      drawingImages: project.drawingImages,
      // 工程阶段
      engineeringCompleted: project.engineeringCompleted,
      engineeringCompletedTime: project.engineeringCompletedTime,
      engineeringCompletedBy: usernameToDisplayName.get(project.engineeringCompletedBy) || project.engineeringCompletedBy,
      engineeringDrawings: project.engineeringDrawings,
      engineeringDocuments: project.engineeringDocuments,
      // 采购阶段
      purchaseCompleted: project.purchaseCompleted,
      purchaseCompletedTime: project.purchaseCompletedTime,
      purchaseCompletedBy: usernameToDisplayName.get(project.purchaseCompletedBy) || project.purchaseCompletedBy,
      purchaseDocuments: project.purchaseDocuments,
      invoiceDocuments: project.invoiceDocuments,
      // 加工阶段
      processingCompleted: project.processingCompleted,
      processingCompletedTime: project.processingCompletedTime,
      processingCompletedBy: usernameToDisplayName.get(project.processingCompletedBy) || project.processingCompletedBy,
      processingImages: project.processingImages,
      // 装配阶段
      assemblyCompleted: project.assemblyCompleted,
      assemblyCompletedTime: project.assemblyCompletedTime,
      assemblyCompletedBy: usernameToDisplayName.get(project.assemblyCompletedBy) || project.assemblyCompletedBy,
      assemblyImages: project.assemblyImages,
      // 调试阶段
      testingCompleted: project.testingCompleted,
      testingCompletedTime: project.testingCompletedTime,
      testingCompletedBy: usernameToDisplayName.get(project.testingCompletedBy) || project.testingCompletedBy,
      // 入库阶段
      warehouseInCompleted: project.warehouseInCompleted,
      warehouseInCompletedTime: project.warehouseInCompletedTime,
      warehouseInCompletedBy: usernameToDisplayName.get(project.warehouseInCompletedBy) || project.warehouseInCompletedBy,
      // 入库阶段图片（第一次入库：零部件/加工件）
      purchaseComponents: project.purchaseComponents,
      processingComponents: project.processingComponents,
      // 第二次入库阶段（整机）
      warehouseInSecondCompleted: project.warehouseInSecondCompleted,
      warehouseInSecondCompletedTime: project.warehouseInSecondCompletedTime,
      warehouseInSecondCompletedBy: usernameToDisplayName.get(project.warehouseInSecondCompletedBy) || project.warehouseInSecondCompletedBy,
      // 出库阶段（第一次）
      warehouseOutCompleted: project.warehouseOutCompleted,
      warehouseOutCompletedTime: project.warehouseOutCompletedTime,
      warehouseOutCompletedBy: usernameToDisplayName.get(project.warehouseOutCompletedBy) || project.warehouseOutCompletedBy,
      // 第二次出库阶段（整机确认）
      warehouseOutSecondCompleted: project.warehouseOutSecondCompleted,
      warehouseOutSecondCompletedTime: project.warehouseOutSecondCompletedTime,
      warehouseOutSecondCompletedBy: usernameToDisplayName.get(project.warehouseOutSecondCompletedBy) || project.warehouseOutSecondCompletedBy,
      // 归档阶段
      archived: project.archived,
      archivedTime: project.archivedTime,
      archivedBy: usernameToDisplayName.get(project.archivedBy) || project.archivedBy,
      archiveSummary: project.archiveSummary,
      // 时间周期
      timeScheduleSet: project.timeScheduleSet,
      timelines: project.timelines,
      // 团队成员上传
      teamMemberUploads: project.teamMemberUploads,
      teamMemberEngineeringUploads: project.teamMemberEngineeringUploads,
      teamMemberPurchaseUploads: project.teamMemberPurchaseUploads,
      teamMemberProcessingUploads: project.teamMemberProcessingUploads,
      teamMemberAssemblyUploads: project.teamMemberAssemblyUploads
    }});
  } catch (error) {
    console.error('获取项目详情错误:', error);
    res.status(500).json({ error: '获取项目详情失败' });
  }
};

// 获取所有项目（合并显示）
exports.getAllProjects = async (req, res) => {
  try {
    const { status, projectType, createdBy } = req.query;
    
    // 构建用户名到显示名的映射
    let usernameToDisplayName = new Map();
    try {
      const users = await User.find({}, 'username displayName').lean();
      usernameToDisplayName = new Map(users.map(u => [u.username, u.displayName || u.username]));
    } catch (err) {
      console.warn('获取用户显示名映射失败:', err);
    }
    
    // 构建查询条件
    let pendingQuery = {};
    let approvedQuery = {};
    
    if (projectType) {
      pendingQuery.projectType = projectType;
      approvedQuery.projectType = projectType;
    }
    if (createdBy) {
      pendingQuery.createdBy = createdBy;
      approvedQuery.createdBy = createdBy;
    }
    
    // 根据状态筛选
    if (status) {
      if (status === 'pending' || status === 'rejected') {
        // 只查询待审批项目
        pendingQuery.status = status;
        approvedQuery = null;
      } else if (status === 'approved' || status === 'in_progress' || status === 'completed' || status === 'cancelled') {
        // 只查询已批准项目
        approvedQuery.status = status;
        pendingQuery = null;
      }
    }
    
    const pendingProjects = pendingQuery ? await PendingProject.find(pendingQuery)
      .populate('createdBy', 'username displayName')
      .sort({ createTime: -1 }) : [];
    
    const approvedProjects = approvedQuery ? await ApprovedProject.find(approvedQuery)
      .populate('createdBy', 'username displayName')
      .sort({ approveTime: -1 }) : [];
    
    // 合并并格式化结果
    const allProjects = [
      ...pendingProjects.map(project => ({
        id: project._id,
        projectName: project.projectName,
        projectType: project.projectType,
        description: project.description,
        researchDirection: project.researchDirection,
        researchPurpose: project.researchPurpose,
        researchBudget: project.researchBudget,
        researchDuration: project.researchDuration,
        contractAmount: project.contractAmount,
        contractDuration: project.contractDuration,
        contractFile: project.contractFile,  // 合同文件名
        budget: project.budget,
        duration: project.duration,
        priority: project.priority,
        status: project.status,
        createdBy: project.createdBy,
        createdByName: project.createdByName,
        createTime: project.createTime,
        approvalProgress: project.approvalProgress, // 审批进度
        approvalRecords: project.approvalRecords, // 审批记录
        rejectedBy: project.rejectedBy,
        rejectedTime: project.rejectedTime,
        rejectedComment: project.rejectedComment,
        category: 'pending' // 标记来源
      })),
      ...approvedProjects.map(project => ({
        id: project._id,
        projectName: project.projectName,
        projectType: project.projectType,
        description: project.description,
        researchDirection: project.researchDirection,
        researchPurpose: project.researchPurpose,
        researchBudget: project.researchBudget,
        researchDuration: project.researchDuration,
        contractAmount: project.contractAmount,
        contractDuration: project.contractDuration,
        contractFile: project.contractFile,  // 合同文件名
        budget: project.budget,
        duration: project.duration,
        priority: project.priority,
        status: project.status,
        createdBy: project.createdBy,
        createdByName: project.createdByName,
        approver: project.approver,
        approveTime: project.approveTime,
        developmentCompleted: project.developmentCompleted,
        developmentCompletedTime: project.developmentCompletedTime,
        developmentCompletedBy: usernameToDisplayName.get(project.developmentCompletedBy) || project.developmentCompletedBy,
        folderScreenshots: project.folderScreenshots,
        drawingImages: project.drawingImages,
        // 工程阶段字段
        engineeringCompleted: project.engineeringCompleted,
        engineeringCompletedTime: project.engineeringCompletedTime,
        engineeringCompletedBy: usernameToDisplayName.get(project.engineeringCompletedBy) || project.engineeringCompletedBy,
        engineeringDrawings: project.engineeringDrawings,
        engineeringDocuments: project.engineeringDocuments,
        // 采购阶段字段
        purchaseCompleted: project.purchaseCompleted,
        purchaseCompletedTime: project.purchaseCompletedTime,
        purchaseCompletedBy: usernameToDisplayName.get(project.purchaseCompletedBy) || project.purchaseCompletedBy,
        purchaseDocuments: project.purchaseDocuments,
        invoiceDocuments: project.invoiceDocuments,
        // 加工阶段字段
        processingCompleted: project.processingCompleted,
        processingCompletedTime: project.processingCompletedTime,
        processingCompletedBy: usernameToDisplayName.get(project.processingCompletedBy) || project.processingCompletedBy,
        processingImages: project.processingImages,
        // 装配阶段字段
        assemblyCompleted: project.assemblyCompleted,
        assemblyCompletedTime: project.assemblyCompletedTime,
        assemblyCompletedBy: usernameToDisplayName.get(project.assemblyCompletedBy) || project.assemblyCompletedBy,
        assemblyImages: project.assemblyImages,
        // 调试阶段
        testingCompleted: project.testingCompleted,
        testingCompletedTime: project.testingCompletedTime,
        testingCompletedBy: usernameToDisplayName.get(project.testingCompletedBy) || project.testingCompletedBy,
        // 入库阶段（第一次）
        warehouseInCompleted: project.warehouseInCompleted,
        warehouseInCompletedTime: project.warehouseInCompletedTime,
        warehouseInCompletedBy: usernameToDisplayName.get(project.warehouseInCompletedBy) || project.warehouseInCompletedBy,
        // 入库阶段上传的图片（用于出库页面展示）
        purchaseComponents: project.purchaseComponents,
        processingComponents: project.processingComponents,
        // 第二次入库阶段（整机）
        warehouseInSecondCompleted: project.warehouseInSecondCompleted,
        warehouseInSecondCompletedTime: project.warehouseInSecondCompletedTime,
        warehouseInSecondCompletedBy: usernameToDisplayName.get(project.warehouseInSecondCompletedBy) || project.warehouseInSecondCompletedBy,
        // 出库阶段（第一次）
        warehouseOutCompleted: project.warehouseOutCompleted,
        warehouseOutCompletedTime: project.warehouseOutCompletedTime,
        warehouseOutCompletedBy: usernameToDisplayName.get(project.warehouseOutCompletedBy) || project.warehouseOutCompletedBy,
        // 第二次出库阶段（整机确认）
        warehouseOutSecondCompleted: project.warehouseOutSecondCompleted,
        warehouseOutSecondCompletedTime: project.warehouseOutSecondCompletedTime,
        warehouseOutSecondCompletedBy: usernameToDisplayName.get(project.warehouseOutSecondCompletedBy) || project.warehouseOutSecondCompletedBy,
        // 归档阶段
        archived: project.archived,
        archivedTime: project.archivedTime,
        archivedBy: usernameToDisplayName.get(project.archivedBy) || project.archivedBy,
        archiveSummary: project.archiveSummary,
        createTime: project.createTime,
        // 时间周期字段
        timeScheduleSet: project.timeScheduleSet,
        timeScheduleSetBy: project.timeScheduleSetBy,
        timeScheduleSetTime: project.timeScheduleSetTime,
        timelines: project.timelines,
        // 团队成员上传
        teamMemberUploads: project.teamMemberUploads,
        teamMemberEngineeringUploads: project.teamMemberEngineeringUploads,
        teamMemberPurchaseUploads: project.teamMemberPurchaseUploads,
        teamMemberProcessingUploads: project.teamMemberProcessingUploads,
        teamMemberAssemblyUploads: project.teamMemberAssemblyUploads,
        category: 'approved' // 标记来源
      }))
    ];
    
    // 按时间排序
    allProjects.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
    
    res.json({
      projects: allProjects
    });
  } catch (error) {
    console.error('获取项目列表错误:', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
};

// 创建新项目（立项申请）- 存储到待审批集合
exports.createProject = async (req, res) => {
  try {
    const {
      projectName,
      projectType,
      description,
      researchDirection,
      researchPurpose,
      researchBudget,
      researchDuration,
      contractAmount,
      contractDuration,
      contractFile,
      budget,
      duration,
      priority
    } = req.body;
    
    console.log('收到立项申请:', req.body); // 调试日志
    
    // 验证必填字段
    if (!projectName || !description) {
      return res.status(400).json({ error: '请填写项目名称和描述' });
    }
    
    // 研发立项的额外验证
    if (projectType === 'research') {
      if (!researchDirection || !researchPurpose) {
        return res.status(400).json({ error: '请填写研发方向和研发用途' });
      }
    }
    
    // 创建待审批项目
    const pendingProject = new PendingProject({
      projectName,
      projectType: projectType || 'research',
      description,
      researchDirection,
      researchPurpose,
      researchBudget,
      researchDuration,
      contractAmount,
      contractDuration,
      contractFile,  // 保存合同文件名
      budget,
      duration,
      priority: priority || 'normal',
      createdBy: req.user._id,
      createdByName: req.user.displayName || req.user.username,
      status: 'pending' // 默认为待审批状态
    });
    
    await pendingProject.save();
    console.log('立项保存成功:', pendingProject._id); // 调试日志
    
    // 为所有管理员创建通知（排除创建者本人）
    try {
      const User = require('../models/User');
      const managers = await User.find({ roles: { $in: ['manager'] } }).select('_id username displayName');
      console.log(`[创建通知] 找到 ${managers.length} 个管理员账号`);
      
      const docs = managers
        .filter(u => String(u._id) !== String(req.user._id))
        .map(u => ({
        type: 'new_project',
        title: '有新的立项申请',
        message: `${req.user.displayName || req.user.username} 发起了新的立项，请及时查看`,
        projectId: pendingProject._id,
        toUserId: u._id,
        fromUserId: req.user._id
      }));
      
      console.log(`[创建通知] 过滤创建者后，需要通知 ${docs.length} 个管理员`);
      
      if (docs.length) {
        await Notification.insertMany(docs);
        console.log(`[创建通知] 成功为 ${docs.length} 个管理员创建通知`);
      } else {
        console.log('[创建通知] 没有需要通知的管理员（可能创建者本人就是唯一的管理员）');
      }
    } catch (e) {
      console.error('创建通知失败（不影响主流程）:', e);
    }

    res.status(201).json({
      message: '立项申请提交成功，已存入待审批列表',
      project: {
        id: pendingProject._id,
        projectName: pendingProject.projectName,
        projectType: pendingProject.projectType,
        description: pendingProject.description,
        status: pendingProject.status,
        createTime: pendingProject.createTime,
        category: 'pending'
      }
    });
  } catch (error) {
    console.error('创建立项错误:', error);
    res.status(500).json({ error: '提交立项申请失败' });
  }
};

// 审批项目 - 支持多人审批
exports.approveProject = async (req, res) => {
  try {
    const { action, comment } = req.body;
    const projectId = req.params.id;
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: '请提供有效的审批操作' });
    }
    
    // 只有管理人员可以进行审批
    if (!req.user.roles || !req.user.roles.includes('manager')) {
      return res.status(403).json({ error: '只有管理人员可以审批该项目' });
    }

    // 拒绝时必须提供理由
    if (action === 'reject' && !comment) {
      return res.status(400).json({ error: '拒绝时必须填写拒绝理由' });
    }
    
    // 从待审批集合中查找项目
    const pendingProject = await PendingProject.findById(projectId);
    
    if (!pendingProject) {
      return res.status(404).json({ error: '待审批项目不存在' });
    }
    
    if (pendingProject.status !== 'pending') {
      return res.status(400).json({ error: '只能审批待审批状态的项目' });
    }
    
    // 检查该用户是否已经审批过
    const existingRecord = pendingProject.approvalRecords.find(
      record => record.approver === req.user.username
    );
    
    if (existingRecord) {
      return res.status(400).json({ error: '您已经审批过此项目' });
    }
    
    // 动态计算所需批准次数 = 当前已批准状态的管理人员数量（至少为1）
    const managersCount = await User.countDocuments({ roles: 'manager', status: 'approved' }).catch(() => 0);
    const requiredApprovals = Math.max(1, managersCount);
    pendingProject.approvalProgress.required = requiredApprovals;

    // 添加审批记录
    const approvalRecord = {
      approver: req.user.username,
      approverName: req.user.displayName || req.user.username,
      decision: action,
      comment: comment || '',
      approvalTime: new Date()
    };
    
    pendingProject.approvalRecords.push(approvalRecord);
    
    if (action === 'approve') {
      // 增加批准人数
      pendingProject.approvalProgress.approved += 1;
      
      // 检查是否达到批准要求（由管理人员数量决定）
      if (pendingProject.approvalProgress.approved >= pendingProject.approvalProgress.required) {
        // 达到要求，转移到已批准集合
        const approvedProject = new ApprovedProject({
          projectName: pendingProject.projectName,
          projectType: pendingProject.projectType,
          description: pendingProject.description,
          researchDirection: pendingProject.researchDirection,
          researchPurpose: pendingProject.researchPurpose,
          researchBudget: pendingProject.researchBudget,
          researchDuration: pendingProject.researchDuration,
          contractAmount: pendingProject.contractAmount,
          contractDuration: pendingProject.contractDuration,
          contractFile: pendingProject.contractFile,  // 保存合同文件名
          budget: pendingProject.budget,
          duration: pendingProject.duration,
          priority: pendingProject.priority,
          createdBy: pendingProject.createdBy,
          createdByName: pendingProject.createdByName,
          createTime: pendingProject.createTime,
          originalPendingId: pendingProject._id,
          approver: `多人审批 (${pendingProject.approvalProgress.approved}/${pendingProject.approvalProgress.required})`,
          approveTime: new Date(),
          approveComment: `${pendingProject.approvalProgress.required}人审批通过`,
          status: 'approved'
        });
        
        await approvedProject.save();
        await PendingProject.findByIdAndDelete(projectId);
        
        // 为项目管理主负责人创建通知
        try {
          const managerLeaders = await User.find({
            isPrimaryLeader: true,
            primaryLeaderRoles: 'manager',
            status: 'approved'
          });
          
          if (managerLeaders.length > 0) {
            const primaryLeaderNotifications = managerLeaders.map(leader => {
              return new Notification({
                toUserId: leader._id,
                type: 'project_needs_schedule',
                title: '新的立项已建立',
                message: `新的立项"${approvedProject.projectName}"已建立，请及时安排时间周期并下发项目`,
                projectId: String(approvedProject._id),
                requiresAction: true
              }).save();
            });
            
            await Promise.all(primaryLeaderNotifications);
            console.log(`已为 ${managerLeaders.length} 个项目管理主负责人创建时间安排通知，项目ID: ${approvedProject._id}`);
          }
        } catch (notifError) {
          console.error('创建主负责人通知失败:', notifError);
          // 不影响主流程，继续执行
        }
        
        // 注意：不在此处通知研发人员，而是等主负责人设置完时间周期后再通知
        // 避免研发人员收到通知但看不到项目的问题
        
        res.json({
          message: '项目已获得全部批准并转移到已批准项目列表',
          project: {
            id: approvedProject._id,
            projectName: approvedProject.projectName,
            status: approvedProject.status,
            approver: approvedProject.approver,
            approveTime: approvedProject.approveTime,
            category: 'approved'
          }
        });
      } else {
        // 尚未达到要求，保存当前进度
        await pendingProject.save();
        
        res.json({
          message: `审批已记录，当前进度：${pendingProject.approvalProgress.approved}/${pendingProject.approvalProgress.required}`,
          project: {
            id: pendingProject._id,
            projectName: pendingProject.projectName,
            status: 'pending',
            approvalProgress: pendingProject.approvalProgress,
            approvalRecords: pendingProject.approvalRecords,
            category: 'pending'
          }
        });
      }
    } else {
      // 拒绝：只要有一个人拒绝，整个项目就拒绝
      pendingProject.status = 'rejected';
      pendingProject.rejectedBy = req.user.displayName || req.user.username;
      pendingProject.rejectedTime = new Date();
      pendingProject.rejectedComment = comment;
      pendingProject.approvalProgress.rejected = 1;
      
      await pendingProject.save();
      
      res.json({
        message: '项目已被拒绝',
        project: {
          id: pendingProject._id,
          projectName: pendingProject.projectName,
          status: pendingProject.status,
          rejectedBy: pendingProject.rejectedBy,
          rejectedTime: pendingProject.rejectedTime,
          rejectedComment: pendingProject.rejectedComment,
          approvalRecords: pendingProject.approvalRecords,
          category: 'pending'
        }
      });
    }
  } catch (error) {
    console.error('审批项目错误:', error);
    res.status(500).json({ error: '审批项目失败' });
  }
};

// 获取项目统计信息
exports.getProjectStats = async (req, res) => {
  try {
    const pendingTotal = await PendingProject.countDocuments();
    const pendingCount = await PendingProject.countDocuments({ status: 'pending' });
    const rejectedCount = await PendingProject.countDocuments({ status: 'rejected' });
    
    const approvedTotal = await ApprovedProject.countDocuments();
    const approvedCount = await ApprovedProject.countDocuments({ status: 'approved' });
    const inProgressCount = await ApprovedProject.countDocuments({ status: 'in_progress' });
    const completedCount = await ApprovedProject.countDocuments({ status: 'completed' });
    
    res.json({
      stats: {
        total: pendingTotal + approvedTotal,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        inProgress: inProgressCount,
        completed: completedCount,
        pendingProjects: pendingTotal,
        approvedProjects: approvedTotal
      }
    });
  } catch (error) {
    console.error('获取统计信息错误:', error);
    res.status(500).json({ error: '获取统计信息失败' });
  }
};

// 编辑项目（管理员权限）
exports.updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const updateData = req.body;
    
    // 先尝试在待审批集合中查找
    let project = await PendingProject.findById(projectId);
    let category = 'pending';
    
    if (!project) {
      // 在已批准集合中查找
      project = await ApprovedProject.findById(projectId);
      category = 'approved';
    }
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    // 检查权限：
    // - 创建者可以
    // - 管理员可以
    // - 已批准项目允许 researcher/engineer/purchaser/processor/assembler/tester/warehouse_in/warehouse_out 角色上传和更新项目
    let canEdit = false;
    if (project.createdBy.toString() === req.user._id.toString()) canEdit = true;
    if (req.user.roles.includes('manager')) canEdit = true;
    if (category === 'approved' && (req.user.roles.includes('researcher') || req.user.roles.includes('engineer') || req.user.roles.includes('purchaser') || req.user.roles.includes('processor') || req.user.roles.includes('assembler') || req.user.roles.includes('tester') || req.user.roles.includes('warehouse_in') || req.user.roles.includes('warehouse_out'))) {
      canEdit = true;
    }
    if (!canEdit) {
      return res.status(403).json({ error: '没有权限修改此项目（需要创建者、管理员，或研发/工程/采购/加工/装配/调试/库管在已批准项目）' });
    }
    
    // 调试：打印传入的关键字段（仅长度，避免日志过长）
    try {
      if (Array.isArray(updateData.folderScreenshots)) {
        console.log('[updateProject] folderScreenshots count:', updateData.folderScreenshots.length);
        if (updateData.folderScreenshots[0]) {
          console.log('[sample folderScreenshot]', {
            name: updateData.folderScreenshots[0].name,
            size: updateData.folderScreenshots[0].size,
            type: updateData.folderScreenshots[0].type
          });
        }
      }
      if (Array.isArray(updateData.drawingImages)) {
        console.log('[updateProject] drawingImages count:', updateData.drawingImages.length);
        if (updateData.drawingImages[0]) {
          console.log('[sample drawingImage]', {
            name: updateData.drawingImages[0].name,
            size: updateData.drawingImages[0].size,
            type: updateData.drawingImages[0].type
          });
        }
      }
    } catch (logErr) {
      console.warn('日志打印失败:', logErr.message);
    }

    // 构造 $set 更新对象（只设置传入的字段）
    const setObj = {};
    for (const key of Object.keys(updateData)) {
      if (updateData[key] !== undefined) {
        setObj[key] = updateData[key];
      }
    }

    const Model = category === 'approved' ? ApprovedProject : PendingProject;

    // 观测：更新前计数
    try {
      const freshBefore = await Model.findById(project._id).lean();
      console.log('[updateProject] before updateOne counts:', {
        folderScreenshots: Array.isArray(freshBefore.folderScreenshots) ? freshBefore.folderScreenshots.length : 'N/A',
        drawingImages: Array.isArray(freshBefore.drawingImages) ? freshBefore.drawingImages.length : 'N/A',
      });
    } catch {}

    // 使用原子更新，避免赋值被忽略
    await Model.updateOne({ _id: project._id }, { $set: setObj }, { strict: false });

    const fresh = await Model.findById(project._id).lean();
    console.log('[updateProject] after updateOne counts:', {
      folderScreenshots: Array.isArray(fresh.folderScreenshots) ? fresh.folderScreenshots.length : 'N/A',
      drawingImages: Array.isArray(fresh.drawingImages) ? fresh.drawingImages.length : 'N/A',
    });
    
    // 如果研发刚完成，通知所有工程师并设置工程阶段开始时间
    if (updateData.developmentCompleted === true && !project.developmentCompleted) {
      try {
        // 设置工程阶段开始时间
        await Model.updateOne(
          { _id: project._id },
          { $set: { 'timelines.engineerStartTime': new Date() } },
          { strict: false }
        );
        console.log('已设置工程阶段开始时间');
        
        const engineers = await User.find({ 
          roles: 'engineer',
          status: 'approved'
        });
        
        const notificationPromises = engineers.map(engineer => {
          return new Notification({
            toUserId: engineer._id,
            type: 'project_ready_for_engineering',
            title: '新项目待处理',
            message: `${project.projectName} 已完成研发设计，请及时开始工程设计`,
            projectId: project._id
          }).save();
        });
        
        await Promise.all(notificationPromises);
        console.log(`已为 ${engineers.length} 名工程师创建项目通知`);
      } catch (notifError) {
        console.error('创建工程师通知失败:', notifError);
        // 不影响主流程，继续执行
      }
    }
    
    // 如果采购刚完成，通知加工人员（下一阶段）
    if (updateData.purchaseCompleted === true && !project.purchaseCompleted) {
      try {
        // 这里可以设置下一阶段开始时间：例如 'timelines.processingStartTime'
        await Model.updateOne(
          { _id: project._id },
          { $set: { 'timelines.processingStartTime': new Date() } },
          { strict: false }
        );

        const processors = await User.find({ roles: 'processor', status: 'approved' });
        const notificationPromises = processors.map(u => new Notification({
          toUserId: u._id,
          type: 'project_ready_for_processing',
          title: '新项目待处理',
          message: `${project.projectName} 已完成采购，请及时开始加工`,
          projectId: project._id
        }).save());
        await Promise.all(notificationPromises);
        console.log(`已为 ${processors.length} 名加工人员创建项目通知`);
      } catch (e) {
        console.error('创建加工人员通知失败:', e);
      }
    }

    // 如果加工刚完成，通知库管入库（新的流程：加工 -> 入库）
    if (updateData.processingCompleted === true && !project.processingCompleted) {
      try {
        // 可选：设置入库阶段开始时间
        await Model.updateOne(
          { _id: project._id },
          { $set: { 'timelines.warehouseInStartTime': new Date() } },
          { strict: false }
        );

        const warehouseInUsers = await User.find({ roles: 'warehouse_in', status: 'approved' });
        const notificationPromises = warehouseInUsers.map(u => new Notification({
          toUserId: u._id,
          type: 'project_ready_for_warehousein',
          title: '新项目待入库',
          message: `${project.projectName} 已完成加工，请尽快入库` ,
          projectId: project._id
        }).save());
        await Promise.all(notificationPromises);
        console.log(`已为 ${warehouseInUsers.length} 名入库管理员创建入库通知`);
      } catch (e) {
        console.error('创建入库通知失败:', e);
      }
    }

    // 如果第一次入库刚完成，通知库管进行第一次出库（领料）
    if (updateData.warehouseInCompleted === true && !project.warehouseInCompleted) {
      try {
        await Model.updateOne(
          { _id: project._id },
          { $set: { 'timelines.warehouseOutStartTime': new Date() } },
          { strict: false }
        );

        const warehouseOutUsers = await User.find({ roles: 'warehouse_out', status: 'approved' });
        const notificationPromises = warehouseOutUsers.map(u => new Notification({
          toUserId: u._id,
          type: 'project_ready_for_warehouseout',
          title: '新项目待出库',
          message: `${project.projectName} 已完成入库，请安排出库领料` ,
          projectId: project._id
        }).save());
        await Promise.all(notificationPromises);
        console.log(`已为 ${warehouseOutUsers.length} 名出库管理员创建第一次出库通知`);
      } catch (e) {
        console.error('创建第一次出库通知失败:', e);
      }
    }

    // 如果第一次出库刚完成，通知装配人员
    if (updateData.warehouseOutCompleted === true && !project.warehouseOutCompleted) {
      try {
        await Model.updateOne(
          { _id: project._id },
          { $set: { 'timelines.assemblerStartTime': new Date() } },
          { strict: false }
        );

        const assemblers = await User.find({ roles: 'assembler', status: 'approved' });
        const notificationPromises = assemblers.map(u => new Notification({
          toUserId: u._id,
          type: 'project_ready_for_assembly',
          title: '新项目待装配',
          message: `${project.projectName} 已完成出库，请开始装配` ,
          projectId: project._id
        }).save());
        await Promise.all(notificationPromises);
        console.log(`已为 ${assemblers.length} 名装配人员创建项目通知`);
      } catch (e) {
        console.error('创建装配人员通知失败:', e);
      }
    }

    // 如果装配刚完成，通知调试（确保装配 -> 调试的通知）
    if (updateData.assemblyCompleted === true && !project.assemblyCompleted) {
      try {
        await Model.updateOne(
          { _id: project._id },
          { $set: { 'timelines.testerStartTime': new Date() } },
          { strict: false }
        );

        const testers = await User.find({ roles: 'tester', status: 'approved' });
        const notificationPromises = testers.map(u => new Notification({
          toUserId: u._id,
          type: 'project_ready_for_testing',
          title: '新项目待调试',
          message: `${project.projectName} 已完成装配，请进行调试`,
          projectId: project._id
        }).save());
        await Promise.all(notificationPromises);
        console.log(`已为 ${testers.length} 名调试人员创建项目通知`);
      } catch (e) {
        console.error('创建调试人员通知失败:', e);
      }
    }

    // 如果调试刚完成，通知库管进行第二次入库（整机入库）
    if (updateData.testingCompleted === true && !project.testingCompleted) {
      try {
        await Model.updateOne(
          { _id: project._id },
          { $set: { 'timelines.warehouseInSecondStartTime': new Date() } },
          { strict: false }
        );

        const warehouseInUsers = await User.find({ roles: 'warehouse_in', status: 'approved' });
        const notificationPromises = warehouseInUsers.map(u => new Notification({
          toUserId: u._id,
          type: 'project_ready_for_warehousein_second',
          title: '新项目待入库（整机）',
          message: `${project.projectName} 已完成调试，请安排整机入库` ,
          projectId: project._id
        }).save());
        await Promise.all(notificationPromises);
        console.log(`已为 ${warehouseInUsers.length} 名入库管理员创建第二次入库通知`);
      } catch (e) {
        console.error('创建第二次入库通知失败:', e);
      }
    }

    // 如果第二次入库刚完成，通知库管进行第二次出库（整机出库确认）
    if (updateData.warehouseInSecondCompleted === true && !project.warehouseInSecondCompleted) {
      try {
        await Model.updateOne(
          { _id: project._id },
          { $set: { 'timelines.warehouseOutSecondStartTime': new Date() } },
          { strict: false }
        );

        const warehouseOutUsers = await User.find({ roles: 'warehouse_out', status: 'approved' });
        const notificationPromises = warehouseOutUsers.map(u => new Notification({
          toUserId: u._id,
          type: 'project_ready_for_warehouseout_second',
          title: '新项目待出库（整机确认）',
          message: `${project.projectName} 已完成整机入库，请安排出库确认` ,
          projectId: project._id
        }).save());
        await Promise.all(notificationPromises);
        console.log(`已为 ${warehouseOutUsers.length} 名出库管理员创建第二次出库通知`);
      } catch (e) {
        console.error('创建第二次出库通知失败:', e);
      }
    }

    // 如果第二次出库刚完成，通知管理员归档项目
    if (updateData.warehouseOutSecondCompleted === true && !project.warehouseOutSecondCompleted) {
      try {
        await Model.updateOne(
          { _id: project._id },
          { $set: { 'timelines.archiveStartTime': new Date() } },
          { strict: false }
        );

        const managers = await User.find({ roles: 'manager', status: 'approved' });
        const notificationPromises = managers.map(u => new Notification({
          toUserId: u._id,
          type: 'project_ready_for_archive',
          title: '新项目待归档',
          message: `${project.projectName} 已完成所有流程，请进行项目归档` ,
          projectId: project._id
        }).save());
        await Promise.all(notificationPromises);
        console.log(`已为 ${managers.length} 名管理员创建归档通知`);
      } catch (e) {
        console.error('创建归档通知失败:', e);
      }
    }

    // 如果工程刚完成，通知所有采购人员并设置采购阶段开始时间
    if (updateData.engineeringCompleted === true && !project.engineeringCompleted) {
      try {
        // 设置采购阶段开始时间
        await Model.updateOne(
          { _id: project._id },
          { $set: { 'timelines.purchaserStartTime': new Date() } },
          { strict: false }
        );
        console.log('已设置采购阶段开始时间');
        
        const purchasers = await User.find({ 
          roles: 'purchaser',
          status: 'approved'
        });
        
        const notificationPromises = purchasers.map(purchaser => {
          return new Notification({
            toUserId: purchaser._id,
            type: 'project_ready_for_purchase',
            title: '新项目待处理',
            message: `${project.projectName} 已完成工程设计，请及时开始采购工作`,
            projectId: project._id
          }).save();
        });
        
        await Promise.all(notificationPromises);
        console.log(`已为 ${purchasers.length} 名采购人员创建项目通知`);
      } catch (notifError) {
        console.error('创建采购人员通知失败:', notifError);
        // 不影响主流程，继续执行
      }
    }
    
    res.json({
      message: '项目更新成功',
      project: {
        id: project._id,
        projectName: project.projectName,
        description: project.description,
        status: project.status,
        developmentCompleted: fresh.developmentCompleted,
        developmentCompletedTime: fresh.developmentCompletedTime,
        developmentCompletedBy: fresh.developmentCompletedBy,
        // 工程阶段字段
        engineeringCompleted: fresh.engineeringCompleted,
        engineeringCompletedTime: fresh.engineeringCompletedTime,
        engineeringCompletedBy: fresh.engineeringCompletedBy,
        // 采购阶段字段
        purchaseCompleted: fresh.purchaseCompleted,
        purchaseCompletedTime: fresh.purchaseCompletedTime,
        purchaseCompletedBy: fresh.purchaseCompletedBy,
        category: category
      }
    });
  } catch (error) {
    console.error('更新项目错误:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
    
    // 如果是Mongoose验证错误，返回更详细的信息
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: '项目验证失败', 
        details: validationErrors.join(', ')
      });
    }
    
    res.status(500).json({ 
      error: '更新项目失败',
      message: error.message,
      code: error.code || undefined
    });
  }
};

// 删除项目（管理员权限）
exports.deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const fs = require('fs');
    const path = require('path');
    
    // 先尝试在待审批集合中查找和删除
    let project = await PendingProject.findById(projectId);
    let category = 'pending';
    
    if (project) {
      // 检查权限
      if (project.createdBy.toString() !== req.user._id.toString() && 
          !req.user.roles.includes('manager')) {
        return res.status(403).json({ error: '没有权限删除此项目' });
      }
      
      await PendingProject.findByIdAndDelete(projectId);
    } else {
      // 在已批准集合中查找和删除
      project = await ApprovedProject.findById(projectId);
      category = 'approved';
      
      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }
      
      // 检查权限：只有管理员可以删除已批准的项目
      if (!req.user.roles.includes('manager')) {
        return res.status(403).json({ error: '只有管理员可以删除已批准的项目' });
      }
      
      await ApprovedProject.findByIdAndDelete(projectId);
    }
    
    // 删除F盘中该项目的所有文件
    if (project) {
      const BASE_UPLOAD_PATH = process.env.UPLOAD_PATH || 'F:\\OA_Files';
      const projectName = project.projectName || '';
      const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
      const folderName = safeName ? `${projectId}_${safeName}` : projectId;
      
      // 所有可能的阶段文件夹
      const stages = [
        'development',
        'engineering', 
        'purchase',
        'processing',
        'assembly',
        'testing',
        'warehouseIn',
        'warehouseOut',
        'archive',
        'contracts'  // 合同文件夹
      ];
      
      console.log(`[DELETE] 开始删除项目文件，项目ID: ${projectId}, 文件夹名: ${folderName}`);
      
      let deletedCount = 0;
      let errorCount = 0;
      
      for (const stage of stages) {
        try {
          const stagePath = path.join(BASE_UPLOAD_PATH, stage);
          
          // 确保阶段目录存在
          if (!fs.existsSync(stagePath)) {
            continue;
          }
          
          // 查找所有以项目ID开头的文件夹（兼容不同的命名规则）
          const allFolders = fs.readdirSync(stagePath);
          const projectFolders = allFolders.filter(folder => {
            // 兼容：仅ID、ID_名称、仅名称、任意ID_名称（名称匹配）
            const matchById = folder === projectId || folder.startsWith(`${projectId}_`);
            const matchByName = safeName ? (folder === safeName || folder.endsWith(`_${safeName}`)) : false;
            return matchById || matchByName;
          });
          
          // 删除找到的所有相关文件夹
          for (const folder of projectFolders) {
            const folderPath = path.join(stagePath, folder);
            
            try {
              if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
                // 递归删除文件夹及其内容
                fs.rmSync(folderPath, { recursive: true, force: true });
                console.log(`[DELETE] ✓ 已删除 ${stage}/${folder}`);
                deletedCount++;
              }
            } catch (err) {
              console.error(`[DELETE] ❌ 删除 ${stage}/${folder} 失败:`, err.message);
              errorCount++;
            }
          }
        } catch (err) {
          console.error(`[DELETE] ❌ 处理阶段 ${stage} 失败:`, err.message);
          errorCount++;
        }
      }
      
      console.log(`[DELETE] 完成! 删除了 ${deletedCount} 个文件夹, ${errorCount} 个失败`);
    }
    
    res.json({ 
      message: `项目已从${category === 'pending' ? '待审批' : '已批准'}列表中删除，相关文件已清理` 
    });
  } catch (error) {
    console.error('删除项目错误:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
};

// 团队成员上传图纸（普通研发人员）
exports.uploadTeamMemberFiles = async (req, res) => {
  try {
    const { projectId, files, role } = req.body;  // 新增 role 参数
    
    if (!projectId || !files || !Array.isArray(files)) {
      return res.status(400).json({ error: '请提供项目ID和文件数据' });
    }
    
    // 查找项目
    const { category } = req.query;
    const Model = category === 'pending' ? PendingProject : ApprovedProject;
    const project = await Model.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    // 根据角色确定验证和存储字段
    const roleConfig = {
      researcher: {
        roleName: '研发人员',
        field: 'teamMemberUploads',
        leaderField: 'researcher',
        uploadTitle: '图纸',
        notificationType: 'team_member_upload'
      },
      engineer: {
        roleName: '工程人员',
        field: 'teamMemberEngineeringUploads',
        leaderField: 'engineer',
        uploadTitle: '图纸',
        notificationType: 'team_member_engineering_upload'
      },
      purchaser: {
        roleName: '采购人员',
        field: 'teamMemberPurchaseUploads',
        leaderField: 'purchaser',
        uploadTitle: '采购文档',
        notificationType: 'team_member_purchase_upload'
      },
      processor: {
        roleName: '加工人员',
        field: 'teamMemberProcessingUploads',
        leaderField: 'processor',
        uploadTitle: '加工图片',
        notificationType: 'team_member_processing_upload'
      },
      assembler: {
        roleName: '装配人员',
        field: 'teamMemberAssemblyUploads',
        leaderField: 'assembler',
        uploadTitle: '装配图片',
        notificationType: 'team_member_assembly_upload'
      }
    };
    
    // 确定当前用户角色（优先使用传入的role，否则自动检测）
    let currentRole = role;
    if (!currentRole) {
      // 自动检测角色
      if (req.user.roles.includes('researcher')) currentRole = 'researcher';
      else if (req.user.roles.includes('engineer')) currentRole = 'engineer';
      else if (req.user.roles.includes('purchaser')) currentRole = 'purchaser';
      else if (req.user.roles.includes('processor')) currentRole = 'processor';
      else if (req.user.roles.includes('assembler')) currentRole = 'assembler';
    }
    
    const config = roleConfig[currentRole];
    if (!config) {
      return res.status(400).json({ error: '无效的角色类型' });
    }
    
    // 验证用户是否有该角色
    if (!req.user.roles || !req.user.roles.includes(currentRole)) {
      return res.status(403).json({ error: `只有${config.roleName}可以上传${config.uploadTitle}` });
    }
    
    // 检查是否为主负责人
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    const isPrimaryLeader = user.isPrimaryLeader && 
                           user.primaryLeaderRoles && 
                           user.primaryLeaderRoles.includes(currentRole);
    
    if (isPrimaryLeader) {
      return res.status(400).json({ 
        error: '主负责人请使用主负责人上传功能',
        message: `您是${config.roleName}主负责人，应该使用正常的上传功能整合所有成员的${config.uploadTitle}`
      });
    }
    
    // 初始化对应的团队上传数组（如果不存在）
    if (!project[config.field]) {
      project[config.field] = [];
    }
    
    // 查找该用户是否已有上传记录
    let memberUpload = project[config.field].find(
      upload => String(upload.uploaderId) === String(req.user._id)
    );
    
    if (memberUpload) {
      // 追加到现有上传记录（不覆盖）
      memberUpload.files = [...(memberUpload.files || []), ...files];
      memberUpload.uploadTime = new Date();
      memberUpload.status = 'pending';
    } else {
      // 创建新的上传记录
      memberUpload = {
        uploaderId: String(req.user._id),
        uploaderName: req.user.displayName || req.user.username,
        files: files,
        uploadTime: new Date(),
        status: 'pending'
      };
      project[config.field].push(memberUpload);
    }
    
    await project.save();
    
    // 发送通知给对应角色的主负责人
    try {
      const Notification = require('../models/Notification');
      
      // 查找对应角色的主负责人
      const primaryLeaders = await User.find({
        isPrimaryLeader: true,
        primaryLeaderRoles: currentRole,
        status: 'approved'
      });
      
      // 为每个主负责人创建通知
      const notifications = primaryLeaders.map(leader => {
        return new Notification({
          toUserId: leader._id,
          type: config.notificationType,
          title: `团队成员已上传${config.uploadTitle}`,
          message: `${req.user.displayName || req.user.username} 已上传"${project.projectName}"的${config.uploadTitle}，请查看并整合`,
          projectId: String(project._id),
          requiresAction: true
        }).save();
      });
      
      await Promise.all(notifications);
      console.log(`已为 ${primaryLeaders.length} 个${config.roleName}主负责人发送通知`);
    } catch (notifError) {
      console.error('发送通知失败:', notifError);
      // 不影响主流程
    }
    
    res.json({
      message: `${config.uploadTitle}已成功提交给${config.roleName}主负责人`,
      upload: {
        uploaderName: memberUpload.uploaderName,
        fileCount: files.length,
        uploadTime: memberUpload.uploadTime
      }
    });
  } catch (error) {
    console.error('团队成员上传失败:', error);
    res.status(500).json({ error: '上传失败' });
  }
};

// 更新团队成员上传状态（主负责人整合后）
exports.updateTeamMemberUploadStatus = async (req, res) => {
  try {
    const { projectId, uploaderId, files, role } = req.body;  // 新增role参数
    
    if (!projectId || !uploaderId || !files) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 查找项目
    const { category } = req.query;
    const Model = category === 'pending' ? PendingProject : ApprovedProject;
    const project = await Model.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    // 根据角色确定字段
    const roleConfig = {
      researcher: { field: 'teamMemberUploads', roleName: '研发' },
      engineer: { field: 'teamMemberEngineeringUploads', roleName: '工程' },
      purchaser: { field: 'teamMemberPurchaseUploads', roleName: '采购' },
      processor: { field: 'teamMemberProcessingUploads', roleName: '加工' },
      assembler: { field: 'teamMemberAssemblyUploads', roleName: '装配' }
    };
    
    // 确定当前角色
    let currentRole = role;
    if (!currentRole) {
      // 自动检测
      const User = require('../models/User');
      const user = await User.findById(req.user._id);
      if (user.isPrimaryLeader && user.primaryLeaderRoles) {
        for (const r of user.primaryLeaderRoles) {
          if (roleConfig[r]) {
            currentRole = r;
            break;
          }
        }
      }
    }
    
    const config = roleConfig[currentRole];
    if (!config) {
      return res.status(400).json({ error: '无效的角色类型' });
    }
    
    // 验证用户是否为对应角色的主负责人
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    const isPrimaryLeader = user.isPrimaryLeader && 
                           user.primaryLeaderRoles && 
                           user.primaryLeaderRoles.includes(currentRole);
    
    if (!isPrimaryLeader) {
      return res.status(403).json({ error: `只有${config.roleName}主负责人可以整合图纸` });
    }
    
    // 初始化对应的团队上传数组
    if (!project[config.field]) {
      project[config.field] = [];
    }
    
    // 查找该成员的上传记录
    const memberUploadIndex = project[config.field].findIndex(
      upload => String(upload.uploaderId) === String(uploaderId)
    );
    
    if (memberUploadIndex === -1) {
      return res.status(404).json({ error: '未找到该成员的上传记录' });
    }
    
    // 更新文件状态
    project[config.field][memberUploadIndex].files = files;
    project[config.field][memberUploadIndex].uploadTime = new Date();
    
    await project.save();
    
    console.log(`✅ 已更新${config.roleName}成员 ${uploaderId} 的上传状态`);
    
    res.json({
      message: '状态更新成功',
      updatedFiles: files.length
    });
  } catch (error) {
    console.error('更新团队成员状态失败:', error);
    res.status(500).json({ error: '更新状态失败' });
  }
};

// 工程师团队成员上传（普通工程师）
exports.uploadTeamMemberEngineeringFiles = async (req, res) => {
  try {
    const { projectId, files } = req.body;
    
    if (!projectId || !files || !Array.isArray(files)) {
      return res.status(400).json({ error: '请提供项目ID和文件数据' });
    }
    
    // 查找项目
    const { category } = req.query;
    const Model = category === 'pending' ? PendingProject : ApprovedProject;
    const project = await Model.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    // 验证用户是否为工程师
    if (!req.user.roles || !req.user.roles.includes('engineer')) {
      return res.status(403).json({ error: '只有工程师可以上传图纸' });
    }
    
    // 检查是否为主负责人
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    const isPrimaryLeader = user.isPrimaryLeader && 
                           user.primaryLeaderRoles && 
                           user.primaryLeaderRoles.includes('engineer');
    
    if (isPrimaryLeader) {
      return res.status(400).json({ 
        error: '主负责人请使用主负责人上传功能',
        message: '您是工程主负责人，应该使用正常的上传功能整合所有成员的图纸'
      });
    }
    
    // 初始化 teamMemberEngineeringUploads 数组
    if (!project.teamMemberEngineeringUploads) {
      project.teamMemberEngineeringUploads = [];
    }
    
    // 查找该用户是否已有上传记录
    let memberUpload = project.teamMemberEngineeringUploads.find(
      upload => String(upload.uploaderId) === String(req.user._id)
    );
    
    if (memberUpload) {
      // 追加到现有上传记录（不覆盖）
      memberUpload.files = [...(memberUpload.files || []), ...files];
      memberUpload.uploadTime = new Date();
      memberUpload.status = 'pending';
    } else {
      // 创建新的上传记录
      memberUpload = {
        uploaderId: String(req.user._id),
        uploaderName: req.user.displayName || req.user.username,
        files: files,
        uploadTime: new Date(),
        status: 'pending'
      };
      project.teamMemberEngineeringUploads.push(memberUpload);
    }
    
    await project.save();
    
    // 发送通知给工程主负责人
    try {
      const Notification = require('../models/Notification');
      
      // 查找工程主负责人
      const primaryLeaders = await User.find({
        isPrimaryLeader: true,
        primaryLeaderRoles: 'engineer',
        status: 'approved'
      });
      
      // 为每个主负责人创建通知
      const notifications = primaryLeaders.map(leader => {
        return new Notification({
          toUserId: leader._id,
          type: 'team_member_upload_engineering',
          title: '团队成员上传了工程图纸',
          message: `${memberUpload.uploaderName} 为项目"${project.projectName}"上传了 ${files.length} 个文件，请及时整合`,
          projectId: String(project._id),
          requiresAction: false
        }).save();
      });
      
      await Promise.all(notifications);
      console.log(`已通知 ${primaryLeaders.length} 个工程主负责人`);
    } catch (notifError) {
      console.error('发送通知失败:', notifError);
      // 不影响主流程
    }
    
    res.json({
      message: '图纸已成功提交给工程主负责人',
      upload: {
        uploaderName: memberUpload.uploaderName,
        fileCount: files.length,
        uploadTime: memberUpload.uploadTime
      }
    });
  } catch (error) {
    console.error('工程师团队成员上传失败:', error);
    res.status(500).json({ error: '上传失败' });
  }
};

// 更新工程师团队成员上传状态（主负责人整合后）
exports.updateTeamMemberEngineeringUploadStatus = async (req, res) => {
  try {
    const { projectId, uploaderId, files } = req.body;
    
    if (!projectId || !uploaderId || !files) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 查找项目
    const { category } = req.query;
    const Model = category === 'pending' ? PendingProject : ApprovedProject;
    const project = await Model.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    // 验证用户是否为工程主负责人
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    const isPrimaryLeader = user.isPrimaryLeader && 
                           user.primaryLeaderRoles && 
                           user.primaryLeaderRoles.includes('engineer');
    
    if (!isPrimaryLeader) {
      return res.status(403).json({ error: '只有工程主负责人可以整合图纸' });
    }
    
    // 初始化 teamMemberEngineeringUploads 数组
    if (!project.teamMemberEngineeringUploads) {
      project.teamMemberEngineeringUploads = [];
    }
    
    // 查找该成员的上传记录
    const memberUploadIndex = project.teamMemberEngineeringUploads.findIndex(
      upload => String(upload.uploaderId) === String(uploaderId)
    );
    
    if (memberUploadIndex === -1) {
      return res.status(404).json({ error: '未找到该成员的上传记录' });
    }
    
    // 更新文件状态
    project.teamMemberEngineeringUploads[memberUploadIndex].files = files;
    project.teamMemberEngineeringUploads[memberUploadIndex].uploadTime = new Date();
    
    await project.save();
    
    console.log(`✅ 已更新工程师成员 ${uploaderId} 的上传状态`);
    
    res.json({
      message: '状态更新成功',
      updatedFiles: files.length
    });
  } catch (error) {
    console.error('更新工程师团队成员状态失败:', error);
    res.status(500).json({ error: '更新状态失败' });
  }
};

module.exports = exports;

