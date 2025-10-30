const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
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
  contractFile: {
    type: String,  // 合同PDF文件名
    default: null
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
  
  // 状态管理
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
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
    type: String
  },
  approveTime: {
    type: Date
  },
  approveComment: {
    type: String
  },
  
  // 研发阶段相关
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
  folderScreenshots: {
    type: Array,
    default: []
  },
  drawingImages: {
    type: Array,
    default: []
  },
  
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
  
  // 工程阶段相关
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
  engineeringDrawings: {
    type: Array,
    default: []
  },
  engineeringDocuments: {
    type: Array,
    default: []
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
  purchaseDocuments: {
    type: Array,
    default: []
  },
  invoiceDocuments: {
    type: Array,
    default: []
  },
  
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
  processingImages: {
    type: Array,
    default: []
  },
  
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
  assemblyImages: {
    type: Array,
    default: []
  },

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
  // 第一次入库时由库管上传的图片
  purchaseComponents: {
    type: Array,
    default: []
  },
  processingComponents: {
    type: Array,
    default: []
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
  
  // 团队成员上传 - 采购
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
  
  // 团队成员上传 - 加工
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
  
  // 团队成员上传 - 装配
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
  },
  
  // 时间戳
  createTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt
});

// 创建索引
projectSchema.index({ createdBy: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ projectType: 1 });
projectSchema.index({ createTime: -1 });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
