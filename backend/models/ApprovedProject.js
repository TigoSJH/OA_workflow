const mongoose = require('mongoose');

const approvedProjectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: [true, '项目名称不能为空'],
    trim: true
  },
  projectType: {
    type: String,
    enum: ['research', 'contract'],
    default: 'research'
  },
  description: {
    type: String,
    required: [true, '项目描述不能为空']
  },
  
  // 研发立项字段
  researchDirection: {
    type: String
  },
  researchPurpose: {
    type: String
  },
  researchBudget: {
    type: String
  },
  researchDuration: {
    type: String
  },
  
  // 合同立项字段
  contractAmount: {
    type: String
  },
  contractDuration: {
    type: String
  },
  
  // 通用字段
  budget: {
    type: String
  },
  duration: {
    type: String
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // 状态管理 - 已批准项目的状态
  status: {
    type: String,
    enum: ['approved', 'in_progress', 'completed', 'cancelled'],
    default: 'approved'
  },
  
  // 创建者信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: {
    type: String,
    required: true
  },
  
  // 审批信息
  approver: {
    type: String,
    required: true
  },
  approveTime: {
    type: Date,
    required: true
  },
  approveComment: {
    type: String
  },
  
  // 原始待审批项目ID（用于追溯）
  originalPendingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PendingProject'
  },
  
  // 时间戳
  createTime: {
    type: Date,
    required: true // 保留原始创建时间
  },
  approvedDate: {
    type: Date,
    default: Date.now // 批准时间
  },
  
  // 研发开发阶段
  developmentFiles: [{
    name: String,           // 原始文件名
    filename: String,       // 存储的文件名
    path: String,           // 完整路径
    relativePath: String,   // 相对路径（用于前端访问）
    size: String,           // 文件大小
    mimetype: String,       // MIME类型
    uploadTime: Date,       // 上传时间
    uploadBy: String        // 上传人
  }],
  // 项目文件夹截图（文件系统存储）
  folderScreenshots: [{
    name: String,
    filename: String,
    path: String,
    relativePath: String,
    size: String,
    mimetype: String,
    uploadTime: Date,
    uploadBy: String
  }],
  // 图纸图片（文件系统存储）
  drawingImages: [{
    name: String,
    filename: String,
    path: String,
    relativePath: String,
    size: String,
    mimetype: String,
    uploadTime: Date,
    uploadBy: String
  }],
  
  // 团队成员上传的图纸（普通研发人员）
  teamMemberUploads: [{
    uploaderId: String,
    uploaderName: String,
    files: [mongoose.Schema.Types.Mixed],
    uploadTime: Date,
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'integrated'],
      default: 'pending'
    }
  }],
  teamMemberEngineeringUploads: [{
    uploaderId: String,
    uploaderName: String,
    files: [mongoose.Schema.Types.Mixed],
    uploadTime: Date,
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'integrated'],
      default: 'pending'
    }
  }],
  teamMemberPurchaseUploads: [{
    uploaderId: String,
    uploaderName: String,
    files: [mongoose.Schema.Types.Mixed],
    uploadTime: Date,
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'integrated'],
      default: 'pending'
    }
  }],
  teamMemberProcessingUploads: [{
    uploaderId: String,
    uploaderName: String,
    files: [mongoose.Schema.Types.Mixed],
    uploadTime: Date,
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'integrated'],
      default: 'pending'
    }
  }],
  teamMemberAssemblyUploads: [{
    uploaderId: String,
    uploaderName: String,
    files: [mongoose.Schema.Types.Mixed],
    uploadTime: Date,
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'integrated'],
      default: 'pending'
    }
  }],
  
  developmentCompleted: {
    type: Boolean,
    default: false
  },
  developmentCompletedTime: {
    type: Date
  },
  developmentCompletedBy: {
    type: String
  },
  
  // 工程阶段
  engineeringDrawings: [{
    name: String,
    filename: String,
    path: String,
    relativePath: String,
    size: String,
    mimetype: String,
    uploadTime: Date,
    uploadBy: String
  }],
  engineeringDocuments: [{
    name: String,
    filename: String,
    path: String,
    relativePath: String,
    size: String,
    mimetype: String,
    uploadTime: Date,
    uploadBy: String
  }],
  engineeringCompleted: {
    type: Boolean,
    default: false
  },
  engineeringCompletedTime: {
    type: Date
  },
  engineeringCompletedBy: {
    type: String
  },
  
  // 采购阶段相关
  purchaseCompleted: {
    type: Boolean,
    default: false
  },
  purchaseCompletedTime: {
    type: Date
  },
  purchaseCompletedBy: {
    type: String
  },
  purchaseDocuments: [{
    name: String,
    filename: String,
    path: String,
    relativePath: String,
    size: String,
    mimetype: String,
    uploadTime: Date,
    uploadBy: String
  }],
  invoiceDocuments: [{
    name: String,
    filename: String,
    path: String,
    relativePath: String,
    size: String,
    mimetype: String,
    uploadTime: Date,
    uploadBy: String
  }],
  
  // 加工阶段相关
  processingCompleted: {
    type: Boolean,
    default: false
  },
  processingCompletedTime: {
    type: Date
  },
  processingCompletedBy: {
    type: String
  },
  processingImages: [{
    name: String,
    filename: String,
    path: String,
    relativePath: String,
    size: String,
    mimetype: String,
    uploadTime: Date,
    uploadBy: String
  }],
  
  // 装配阶段相关
  assemblyCompleted: {
    type: Boolean,
    default: false
  },
  assemblyCompletedTime: {
    type: Date
  },
  assemblyCompletedBy: {
    type: String
  },
  assemblyImages: [{
    name: String,
    filename: String,
    path: String,
    relativePath: String,
    size: String,
    mimetype: String,
    uploadTime: Date,
    uploadBy: String
  }],

  // 调试阶段相关
  testingCompleted: {
    type: Boolean,
    default: false
  },
  testingCompletedTime: {
    type: Date
  },
  testingCompletedBy: {
    type: String
  },

  // 入库阶段相关
  warehouseInCompleted: {
    type: Boolean,
    default: false
  },
  warehouseInCompletedTime: {
    type: Date
  },
  warehouseInCompletedBy: {
    type: String
  },

  // 出库阶段相关（第一次出库：装配前领料）
  warehouseOutCompleted: {
    type: Boolean,
    default: false
  },
  warehouseOutCompletedTime: {
    type: Date
  },
  warehouseOutCompletedBy: {
    type: String
  },

  // 第二次入库阶段相关（整机入库）
  warehouseInSecondCompleted: {
    type: Boolean,
    default: false
  },
  warehouseInSecondCompletedTime: {
    type: Date
  },
  warehouseInSecondCompletedBy: {
    type: String
  },

  // 第二次出库阶段相关（整机出库确认）
  warehouseOutSecondCompleted: {
    type: Boolean,
    default: false
  },
  warehouseOutSecondCompletedTime: {
    type: Date
  },
  warehouseOutSecondCompletedBy: {
    type: String
  },

  // 归档阶段相关
  archived: {
    type: Boolean,
    default: false
  },
  archivedTime: {
    type: Date
  },
  archivedBy: {
    type: String
  },
  archiveSummary: {
    type: String,
    default: ''
  },
  
  // 项目时间周期管理（主负责人设置）
  timeScheduleSet: {
    type: Boolean,
    default: false
  },
  timeScheduleSetBy: {
    type: String
  },
  timeScheduleSetTime: {
    type: Date
  },
  
  // 各岗位时间安排（单位：日）
  timelines: {
    // 研发时间
    researcherTime: {
      type: Number,
      default: 0
    },
    researcherStartTime: {
      type: Date  // 研发阶段开始时间
    },
    researcherActualTime: {
      type: Number
    },
    researcherStatus: {
      type: String,
      enum: ['pending', 'early', 'ontime', 'late'],
      default: 'pending'
    },
    
    // 工程出图时间
    engineerTime: {
      type: Number,
      default: 0
    },
    engineerStartTime: {
      type: Date  // 工程阶段开始时间
    },
    engineerActualTime: {
      type: Number
    },
    engineerStatus: {
      type: String,
      enum: ['pending', 'early', 'ontime', 'late'],
      default: 'pending'
    },
    
    // 采购时间
    purchaserTime: {
      type: Number,
      default: 0
    },
    purchaserStartTime: {
      type: Date  // 采购阶段开始时间
    },
    purchaserActualTime: {
      type: Number
    },
    purchaserStatus: {
      type: String,
      enum: ['pending', 'early', 'ontime', 'late'],
      default: 'pending'
    },
    
    // 加工时间
    processorTime: {
      type: Number,
      default: 0
    },
    processorStartTime: {
      type: Date  // 加工阶段开始时间
    },
    processorActualTime: {
      type: Number
    },
    processorStatus: {
      type: String,
      enum: ['pending', 'early', 'ontime', 'late'],
      default: 'pending'
    },
    
    // 装配时间
    assemblerTime: {
      type: Number,
      default: 0
    },
    assemblerStartTime: {
      type: Date  // 装配阶段开始时间
    },
    assemblerActualTime: {
      type: Number
    },
    assemblerStatus: {
      type: String,
      enum: ['pending', 'early', 'ontime', 'late'],
      default: 'pending'
    },
    
    // 调试时间
    testerTime: {
      type: Number,
      default: 0
    },
    testerStartTime: {
      type: Date  // 调试阶段开始时间
    },

    // 入库时间
    warehouseInTime: {
      type: Number,
      default: 0
    },
    warehouseInStartTime: {
      type: Date  // 入库阶段开始时间
    },

    // 出库时间
    warehouseOutTime: {
      type: Number,
      default: 0
    },
    warehouseOutStartTime: {
      type: Date  // 出库阶段开始时间
    },
    testerActualTime: {
      type: Number
    },
    testerStatus: {
      type: String,
      enum: ['pending', 'early', 'ontime', 'late'],
      default: 'pending'
    },
    
    // 入库出库时间
    warehouseTime: {
      type: Number,
      default: 0
    },
    warehouseActualTime: {
      type: Number
    },
    warehouseStatus: {
      type: String,
      enum: ['pending', 'early', 'ontime', 'late'],
      default: 'pending'
    }
  }
}, {
  timestamps: true
});

// 创建索引
approvedProjectSchema.index({ createdBy: 1 });
approvedProjectSchema.index({ status: 1 });
approvedProjectSchema.index({ projectType: 1 });
approvedProjectSchema.index({ approveTime: -1 });
approvedProjectSchema.index({ approver: 1 });

const ApprovedProject = mongoose.model('ApprovedProject', approvedProjectSchema);

module.exports = ApprovedProject;

