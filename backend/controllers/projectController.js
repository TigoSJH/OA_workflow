const Project = require('../models/Project');

// 获取所有项目
exports.getProjects = async (req, res) => {
  try {
    const { status, projectType, createdBy } = req.query;
    
    // 构建查询条件
    let query = {};
    if (status) query.status = status;
    if (projectType) query.projectType = projectType;
    if (createdBy) query.createdBy = createdBy;
    
    let projects = await Project.find(query)
      .populate('createdBy', 'username displayName')
      .sort({ createTime: -1 });
    
    // 如果查询已批准的项目，也从 ApprovedProject 表中获取
    if (status === 'approved') {
      const ApprovedProject = require('../models/ApprovedProject');
      let approvedQuery = {};
      if (projectType) approvedQuery.projectType = projectType;
      if (createdBy) approvedQuery.createdBy = createdBy;
      
      const approvedProjects = await ApprovedProject.find(approvedQuery)
        .populate('createdBy', 'username displayName')
        .sort({ createTime: -1 });
      
      // 合并两个数组，但避免重复（通过 _id 去重）
      const projectIds = new Set(projects.map(p => p._id.toString()));
      approvedProjects.forEach(ap => {
        if (!projectIds.has(ap._id.toString())) {
          projects.push(ap);
        }
      });
      
      // 重新排序
      projects.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
    }
    
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
        contractFile: project.contractFile,  // 合同文件
        budget: project.budget,
        duration: project.duration,
        priority: project.priority,
        status: project.status,
        createdBy: project.createdBy,
        createdByName: project.createdByName,
        approver: project.approver,
        approveTime: project.approveTime,
        approveComment: project.approveComment,
        createTime: project.createTime,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        // 研发阶段
        developmentCompleted: project.developmentCompleted,
        developmentCompletedTime: project.developmentCompletedTime,
        developmentCompletedBy: project.developmentCompletedBy,
        folderScreenshots: project.folderScreenshots,
        drawingImages: project.drawingImages,
        // 工程阶段
        engineeringCompleted: project.engineeringCompleted,
        engineeringCompletedTime: project.engineeringCompletedTime,
        engineeringCompletedBy: project.engineeringCompletedBy,
        engineeringDrawings: project.engineeringDrawings,
        engineeringDocuments: project.engineeringDocuments,
        // 采购阶段
        purchaseCompleted: project.purchaseCompleted,
        purchaseCompletedTime: project.purchaseCompletedTime,
        purchaseCompletedBy: project.purchaseCompletedBy,
        purchaseDocuments: project.purchaseDocuments,
        invoiceDocuments: project.invoiceDocuments,
        // 加工阶段
        processingCompleted: project.processingCompleted,
        processingCompletedTime: project.processingCompletedTime,
        processingCompletedBy: project.processingCompletedBy,
        processingImages: project.processingImages,
        // 装配阶段
        assemblyCompleted: project.assemblyCompleted,
        assemblyCompletedTime: project.assemblyCompletedTime,
        assemblyCompletedBy: project.assemblyCompletedBy,
        assemblyImages: project.assemblyImages,
        // 调试阶段
        testingCompleted: project.testingCompleted,
        testingCompletedTime: project.testingCompletedTime,
        testingCompletedBy: project.testingCompletedBy,
        // 入库阶段
        warehouseInCompleted: project.warehouseInCompleted,
        warehouseInCompletedTime: project.warehouseInCompletedTime,
        warehouseInCompletedBy: project.warehouseInCompletedBy,
        // 出库阶段
        warehouseOutCompleted: project.warehouseOutCompleted,
        warehouseOutCompletedTime: project.warehouseOutCompletedTime,
        warehouseOutCompletedBy: project.warehouseOutCompletedBy,
        // 归档阶段
        archived: project.archived,
        archivedTime: project.archivedTime,
        archivedBy: project.archivedBy,
        archiveSummary: project.archiveSummary,
        // 时间周期
        timeScheduleSet: project.timeScheduleSet,
        timelines: project.timelines,
        // 团队成员上传
        teamMemberPurchaseUploads: project.teamMemberPurchaseUploads,
        teamMemberProcessingUploads: project.teamMemberProcessingUploads,
        teamMemberAssemblyUploads: project.teamMemberAssemblyUploads
      }))
    });
  } catch (error) {
    console.error('获取项目列表错误:', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
};

// 获取单个项目
exports.getProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id)
      .populate('createdBy', 'username displayName');
    
    // 如果在 Project 表中找不到，尝试从 ApprovedProject 表中查找
    if (!project) {
      const ApprovedProject = require('../models/ApprovedProject');
      project = await ApprovedProject.findById(req.params.id)
        .populate('createdBy', 'username displayName');
    }
    
    const User = require('../models/User');
    let usernameToDisplayName = new Map();
    try {
      const users = await User.find({}, 'username displayName').lean();
      usernameToDisplayName = new Map(users.map(u => [u.username, u.displayName || u.username]));
    } catch {}
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    res.json({
      project: {
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
        contractFile: project.contractFile,  // 合同文件
        budget: project.budget,
        duration: project.duration,
        priority: project.priority,
        status: project.status,
        createdBy: project.createdBy,
        createdByName: project.createdByName,
        approver: project.approver,
        approveTime: project.approveTime,
        approveComment: project.approveComment,
        createTime: project.createTime,
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
        // 出库阶段
        warehouseOutCompleted: project.warehouseOutCompleted,
        warehouseOutCompletedTime: project.warehouseOutCompletedTime,
        warehouseOutCompletedBy: usernameToDisplayName.get(project.warehouseOutCompletedBy) || project.warehouseOutCompletedBy,
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
      }
    });
  } catch (error) {
    console.error('获取项目详情错误:', error);
    res.status(500).json({ error: '获取项目详情失败' });
  }
};

// 创建新项目（立项申请）
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
      budget,
      duration,
      priority
    } = req.body;
    
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
    
    // 创建项目
    const project = new Project({
      projectName,
      projectType: projectType || 'research',
      description,
      researchDirection,
      researchPurpose,
      researchBudget,
      researchDuration,
      contractAmount,
      contractDuration,
      budget,
      duration,
      priority: priority || 'normal',
      createdBy: req.user._id,
      createdByName: req.user.displayName || req.user.username,
      status: 'pending' // 新建项目默认为待审批状态
    });
    
    await project.save();
    
    res.status(201).json({
      message: '立项申请提交成功',
      project: {
        id: project._id,
        projectName: project.projectName,
        projectType: project.projectType,
        description: project.description,
        status: project.status,
        createTime: project.createTime
      }
    });
  } catch (error) {
    console.error('创建项目错误:', error);
    res.status(500).json({ error: '提交立项申请失败' });
  }
};

// 审批项目
exports.approveProject = async (req, res) => {
  try {
    const { action, comment } = req.body;
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: '请提供有效的审批操作' });
    }
    
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    if (project.status !== 'pending') {
      return res.status(400).json({ error: '只能审批待审批状态的项目' });
    }
    
    // 更新项目状态
    project.status = action === 'approve' ? 'approved' : 'rejected';
    project.approver = req.user.displayName || req.user.username;
    project.approveTime = new Date();
    project.approveComment = comment || '';
    
    await project.save();
    
    const actionText = action === 'approve' ? '批准' : '拒绝';
    
    res.json({
      message: `项目已${actionText}`,
      project: {
        id: project._id,
        projectName: project.projectName,
        status: project.status,
        approver: project.approver,
        approveTime: project.approveTime
      }
    });
  } catch (error) {
    console.error('审批项目错误:', error);
    res.status(500).json({ error: '审批项目失败' });
  }
};

// 更新项目
exports.updateProject = async (req, res) => {
  try {
    const {
      projectName,
      description,
      researchDirection,
      researchPurpose,
      budget,
      duration,
      priority,
      status,
      // 研发阶段
      developmentCompleted,
      developmentCompletedTime,
      developmentCompletedBy,
      folderScreenshots,
      drawingImages,
      // 工程阶段
      engineeringCompleted,
      engineeringCompletedTime,
      engineeringCompletedBy,
      engineeringDrawings,
      engineeringDocuments,
      // 采购阶段
      purchaseCompleted,
      purchaseCompletedTime,
      purchaseCompletedBy,
      purchaseDocuments,
      invoiceDocuments,
      // 加工阶段
      processingCompleted,
      processingCompletedTime,
      processingCompletedBy,
      processingImages,
      // 装配阶段
      assemblyCompleted,
      assemblyCompletedTime,
      assemblyCompletedBy,
      assemblyImages,
      // 调试阶段
      testingCompleted,
      testingCompletedTime,
      testingCompletedBy,
      // 入库阶段
      warehouseInCompleted,
      warehouseInCompletedTime,
      warehouseInCompletedBy,
      // 出库阶段
      warehouseOutCompleted,
      warehouseOutCompletedTime,
      warehouseOutCompletedBy,
      // 归档阶段
      archived,
      archivedTime,
      archivedBy,
      archiveSummary,
      // 第二次入库
      warehouseInSecondCompleted,
      warehouseInSecondCompletedTime,
      warehouseInSecondCompletedBy,
      // 第二次出库
      warehouseOutSecondCompleted,
      warehouseOutSecondCompletedTime,
      warehouseOutSecondCompletedBy
    } = req.body;
    
    const ApprovedProject = require('../models/ApprovedProject');
    const project = await ApprovedProject.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    // 检查权限：只有创建者或管理员或相关角色可以修改
    if (project.createdBy.toString() !== req.user._id.toString() && 
        !req.user.roles.includes('admin') &&
        !req.user.roles.includes('researcher') &&
        !req.user.roles.includes('engineer') &&
        !req.user.roles.includes('purchaser') &&
        !req.user.roles.includes('processor') &&
        !req.user.roles.includes('assembler') &&
        !req.user.roles.includes('tester') &&
        !req.user.roles.includes('warehouse_in') &&
        !req.user.roles.includes('warehouse_out')) {
      return res.status(403).json({ error: '没有权限修改此项目' });
    }
    
    // 更新字段
    if (projectName !== undefined) project.projectName = projectName;
    if (description !== undefined) project.description = description;
    if (researchDirection !== undefined) project.researchDirection = researchDirection;
    if (researchPurpose !== undefined) project.researchPurpose = researchPurpose;
    if (budget !== undefined) project.budget = budget;
    if (duration !== undefined) project.duration = duration;
    if (priority !== undefined) project.priority = priority;
    
    // 研发阶段字段
    if (developmentCompleted !== undefined) project.developmentCompleted = developmentCompleted;
    if (developmentCompletedTime !== undefined) project.developmentCompletedTime = developmentCompletedTime;
    if (developmentCompletedBy !== undefined) project.developmentCompletedBy = developmentCompletedBy;
    if (folderScreenshots !== undefined) project.folderScreenshots = folderScreenshots;
    if (drawingImages !== undefined) project.drawingImages = drawingImages;
    
    // 工程阶段字段
    if (engineeringCompleted !== undefined) project.engineeringCompleted = engineeringCompleted;
    if (engineeringCompletedTime !== undefined) project.engineeringCompletedTime = engineeringCompletedTime;
    if (engineeringCompletedBy !== undefined) project.engineeringCompletedBy = engineeringCompletedBy;
    if (engineeringDrawings !== undefined) project.engineeringDrawings = engineeringDrawings;
    if (engineeringDocuments !== undefined) project.engineeringDocuments = engineeringDocuments;
    
    // 采购阶段字段
    if (purchaseCompleted !== undefined) project.purchaseCompleted = purchaseCompleted;
    if (purchaseCompletedTime !== undefined) project.purchaseCompletedTime = purchaseCompletedTime;
    if (purchaseCompletedBy !== undefined) project.purchaseCompletedBy = purchaseCompletedBy;
    if (purchaseDocuments !== undefined) project.purchaseDocuments = purchaseDocuments;
    if (invoiceDocuments !== undefined) project.invoiceDocuments = invoiceDocuments;
    
    // 加工阶段字段
    if (processingCompleted !== undefined) project.processingCompleted = processingCompleted;
    if (processingCompletedTime !== undefined) project.processingCompletedTime = processingCompletedTime;
    if (processingCompletedBy !== undefined) project.processingCompletedBy = processingCompletedBy;
    if (processingImages !== undefined) project.processingImages = processingImages;
    
    // 装配阶段字段
    if (assemblyCompleted !== undefined) project.assemblyCompleted = assemblyCompleted;
    if (assemblyCompletedTime !== undefined) project.assemblyCompletedTime = assemblyCompletedTime;
    if (assemblyCompletedBy !== undefined) project.assemblyCompletedBy = assemblyCompletedBy;
    if (assemblyImages !== undefined) project.assemblyImages = assemblyImages;
    
    // 调试阶段字段
    if (testingCompleted !== undefined) project.testingCompleted = testingCompleted;
    if (testingCompletedTime !== undefined) project.testingCompletedTime = testingCompletedTime;
    if (testingCompletedBy !== undefined) project.testingCompletedBy = testingCompletedBy;
    
    // 入库阶段字段
    if (warehouseInCompleted !== undefined) project.warehouseInCompleted = warehouseInCompleted;
    if (warehouseInCompletedTime !== undefined) project.warehouseInCompletedTime = warehouseInCompletedTime;
    if (warehouseInCompletedBy !== undefined) project.warehouseInCompletedBy = warehouseInCompletedBy;
    
    // 第二次入库阶段字段
    if (warehouseInSecondCompleted !== undefined) project.warehouseInSecondCompleted = warehouseInSecondCompleted;
    if (warehouseInSecondCompletedTime !== undefined) project.warehouseInSecondCompletedTime = warehouseInSecondCompletedTime;
    if (warehouseInSecondCompletedBy !== undefined) project.warehouseInSecondCompletedBy = warehouseInSecondCompletedBy;

    // 出库阶段字段
    if (warehouseOutCompleted !== undefined) project.warehouseOutCompleted = warehouseOutCompleted;
    if (warehouseOutCompletedTime !== undefined) project.warehouseOutCompletedTime = warehouseOutCompletedTime;
    if (warehouseOutCompletedBy !== undefined) project.warehouseOutCompletedBy = warehouseOutCompletedBy;
    
    // 第二次出库阶段字段
    if (warehouseOutSecondCompleted !== undefined) project.warehouseOutSecondCompleted = warehouseOutSecondCompleted;
    if (warehouseOutSecondCompletedTime !== undefined) project.warehouseOutSecondCompletedTime = warehouseOutSecondCompletedTime;
    if (warehouseOutSecondCompletedBy !== undefined) project.warehouseOutSecondCompletedBy = warehouseOutSecondCompletedBy;

    // 归档阶段字段
    if (archived !== undefined) project.archived = archived;
    if (archivedTime !== undefined) project.archivedTime = archivedTime;
    if (archivedBy !== undefined) project.archivedBy = archivedBy;
    if (archiveSummary !== undefined) project.archiveSummary = archiveSummary;
    
    // 只有管理员可以修改状态
    if (status !== undefined && req.user.roles.includes('admin')) {
      project.status = status;
    }
    
    await project.save();

    // 如果完成了出库，则给管理主负责人发送归档提醒
    try {
      const completedSecondWarehouseOut = warehouseOutSecondCompleted === true || project.warehouseOutSecondCompleted === true;
      const completedWarehouseOut = warehouseOutCompleted === true || project.warehouseOutCompleted === true;
      
      if (completedWarehouseOut || completedSecondWarehouseOut) {
        const Notification = require('../models/Notification');
        const User = require('../models/User');
        const managers = await User.find({
          isPrimaryLeader: true,
          primaryLeaderRoles: 'manager',
          status: 'approved'
        }).select('_id');

        if (managers && managers.length > 0) {
          const docs = managers.map(m => ({
            toUserId: m._id,
            type: 'project_ready_for_archive',
            title: '项目已完成，请及时归档',
            message: `项目"${project.projectName}"已完成出库，请及时归档`,
            projectId: project._id,
            requiresAction: true
          }));
          await Notification.insertMany(docs);
        }
      }
    } catch (notifErr) {
      console.error('创建归档提醒通知失败（忽略继续）:', notifErr);
    }

    res.json({
      message: '项目更新成功',
      project: {
        id: project._id,
        projectName: project.projectName,
        description: project.description,
        status: project.status
      }
    });
  } catch (error) {
    console.error('更新项目错误:', error);
    res.status(500).json({ error: '更新项目失败' });
  }
};

// 删除项目
exports.deleteProject = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    // 检查权限：只有创建者或管理员可以删除
    if (project.createdBy.toString() !== req.user._id.toString() && 
        !req.user.roles.includes('admin')) {
      return res.status(403).json({ error: '没有权限删除此项目' });
    }
    
    // 不允许删除已批准的项目（除非是管理员）
    if (project.status === 'approved' && !req.user.roles.includes('admin')) {
      return res.status(403).json({ error: '不能删除已批准的项目' });
    }
    
    await Project.findByIdAndDelete(req.params.id);
    
    // 删除F盘中该项目的所有文件
    const BASE_UPLOAD_PATH = process.env.UPLOAD_PATH || 'F:\\OA_Files';
    const projectId = req.params.id;
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
          return folder === projectId || folder.startsWith(`${projectId}_`);
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
    
    res.json({ message: '项目已删除，相关文件已清理' });
  } catch (error) {
    console.error('删除项目错误:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
};

// 获取项目统计信息
exports.getProjectStats = async (req, res) => {
  try {
    const total = await Project.countDocuments();
    const pending = await Project.countDocuments({ status: 'pending' });
    const approved = await Project.countDocuments({ status: 'approved' });
    const rejected = await Project.countDocuments({ status: 'rejected' });
    const inProgress = await Project.countDocuments({ status: 'in_progress' });
    const completed = await Project.countDocuments({ status: 'completed' });
    
    res.json({
      stats: {
        total,
        pending,
        approved,
        rejected,
        inProgress,
        completed
      }
    });
  } catch (error) {
    console.error('获取统计信息错误:', error);
    res.status(500).json({ error: '获取统计信息失败' });
  }
};

// 设置项目时间周期（主负责人专用）
exports.setProjectTimelines = async (req, res) => {
  try {
    const { projectId, timelines } = req.body;
    
    if (!projectId || !timelines) {
      return res.status(400).json({ error: '请提供项目ID和时间安排' });
    }
    
    // 验证用户是否为项目管理主负责人
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    
    // 详细日志，帮助调试
    console.log('=== 权限验证调试信息 ===');
    console.log('用户名:', user.username);
    console.log('isPrimaryLeader:', user.isPrimaryLeader, '(类型:', typeof user.isPrimaryLeader, ')');
    console.log('primaryLeaderRoles:', user.primaryLeaderRoles);
    console.log('roles:', user.roles);
    console.log('验证条件1 - isPrimaryLeader:', !user.isPrimaryLeader);
    console.log('验证条件2 - primaryLeaderRoles存在:', !user.primaryLeaderRoles);
    console.log('验证条件3 - 包含manager:', user.primaryLeaderRoles ? !user.primaryLeaderRoles.includes('manager') : 'N/A');
    console.log('=======================');
    
    // 允许以下任一条件通过：
    // 1) 是主负责人，且主负责人角色包含 manager
    // 2) 具有系统管理员(admin)角色
    // 3) 具有管理人员(manager)常规角色（向后兼容，避免误配导致无法设置）
    const isPrimaryManager = !!(user.isPrimaryLeader && Array.isArray(user.primaryLeaderRoles) && user.primaryLeaderRoles.includes('manager'));
    const isAdmin = Array.isArray(user.roles) && user.roles.includes('admin');
    const isManager = Array.isArray(user.roles) && user.roles.includes('manager');

    if (!(isPrimaryManager || isAdmin || isManager)) {
      console.error('❌ 权限验证失败:', {
        isPrimaryLeader: user.isPrimaryLeader,
        primaryLeaderRoles: user.primaryLeaderRoles,
        hasPrimaryManager: isPrimaryManager,
        roles: user.roles,
        isAdmin,
        isManager
      });
      return res.status(403).json({ 
        error: '当前账号无权限设置时间周期（需主负责人/管理员/管理人员）',
        debug: {
          isPrimaryLeader: user.isPrimaryLeader,
          primaryLeaderRoles: user.primaryLeaderRoles,
          roles: user.roles,
          isPrimaryManager,
          isAdmin,
          isManager
        }
      });
    }
    
    console.log('✅ 权限验证通过');

    
    // 查找项目（可能在ApprovedProject中）
    const ApprovedProject = require('../models/ApprovedProject');
    const project = await ApprovedProject.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    if (project.status !== 'approved') {
      return res.status(400).json({ error: '只能为已批准的项目设置时间周期' });
    }
    
    // 更新时间周期
    project.timeScheduleSet = true;
    project.timeScheduleSetBy = req.user.displayName || req.user.username;
    project.timeScheduleSetTime = new Date();
    project.timelines = timelines;
    
    // 设置研发阶段开始时间（项目下发时即开始）
    if (timelines.researcherTime && timelines.researcherTime > 0) {
      project.timelines.researcherStartTime = new Date();
    }
    
    await project.save();
    
    // 发送通知给研发人员（项目下发时只通知第一阶段负责人）
    try {
      const Notification = require('../models/Notification');
      const User = require('../models/User');
      
      // 只通知研发人员，后续阶段会在前一阶段完成时自动通知
      const rolesToNotify = ['researcher'];
      
      // 获取所有研发人员
      const usersToNotify = await User.find({
        roles: { $in: rolesToNotify },
        status: 'approved'
      });
      
      // 为每个用户创建通知
      const notifications = usersToNotify.map(notifyUser => {
        return new Notification({
          toUserId: notifyUser._id,
          type: 'project_assigned',
          title: '新项目已下发',
          message: `项目"${project.projectName}"已完成时间安排并下发，请及时完成研发工作`,
          projectId: String(project._id),
          requiresAction: true
        }).save();
      });
      
      await Promise.all(notifications);
      console.log(`已为 ${usersToNotify.length} 名研发人员发送项目下发通知`);
    } catch (notifError) {
      console.error('发送项目下发通知失败:', notifError);
      // 不影响主流程，继续执行
    }
    
    res.json({
      message: '项目时间周期设置成功，已下发给相关人员',
      project: {
        id: project._id,
        projectName: project.projectName,
        timeScheduleSet: project.timeScheduleSet,
        timeScheduleSetBy: project.timeScheduleSetBy,
        timeScheduleSetTime: project.timeScheduleSetTime,
        timelines: project.timelines
      }
    });
  } catch (error) {
    console.error('设置项目时间周期错误:', error);
    res.status(500).json({ error: '设置项目时间周期失败' });
  }
};

// 更新项目时间完成状态
exports.updateTimelineStatus = async (req, res) => {
  try {
    const { projectId, role, actualTime } = req.body;
    
    if (!projectId || !role || actualTime === undefined) {
      return res.status(400).json({ error: '请提供完整的参数' });
    }
    
    // 查找项目
    const ApprovedProject = require('../models/ApprovedProject');
    const project = await ApprovedProject.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    if (!project.timelines) {
      return res.status(400).json({ error: '项目尚未设置时间周期' });
    }
    
    // 计算状态
    const plannedTime = project.timelines[`${role}Time`];
    let status = 'ontime';
    
    if (actualTime < plannedTime) {
      status = 'early';
    } else if (actualTime > plannedTime) {
      status = 'late';
    }
    
    // 更新实际时间和状态
    project.timelines[`${role}ActualTime`] = actualTime;
    project.timelines[`${role}Status`] = status;
    
    await project.save();
    
    res.json({
      message: '时间状态更新成功',
      timeline: {
        role,
        plannedTime,
        actualTime,
        status
      }
    });
  } catch (error) {
    console.error('更新时间状态错误:', error);
    res.status(500).json({ error: '更新时间状态失败' });
  }
};
