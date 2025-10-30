const mongoose = require('mongoose');

const pendingProjectSchema = new mongoose.Schema({
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
  
  // 状态管理 - 待审批项目的状态
  status: {
    type: String,
    enum: ['pending', 'rejected'], // 只有待审批和已拒绝
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
  
  // 多人审批记录
  approvalRecords: [{
    approver: {
      type: String,
      required: true
    },
    approverName: {
      type: String,
      required: true
    },
    decision: {
      type: String,
      enum: ['approve', 'reject'],
      required: true
    },
    comment: {
      type: String
    },
    approvalTime: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 审批进度统计
  approvalProgress: {
    required: {
      type: Number,
      default: 3 // 需要3个人审批
    },
    approved: {
      type: Number,
      default: 0 // 已批准人数
    },
    rejected: {
      type: Number,
      default: 0 // 已拒绝人数
    }
  },
  
  // 最终审批结果（当达到条件时设置）
  finalApprover: {
    type: String
  },
  finalApprovalTime: {
    type: Date
  },
  
  // 审批信息（如果被拒绝）
  rejectedBy: {
    type: String
  },
  rejectedTime: {
    type: Date
  },
  rejectedComment: {
    type: String
  },
  
  // 时间戳
  createTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 创建索引
pendingProjectSchema.index({ createdBy: 1 });
pendingProjectSchema.index({ status: 1 });
pendingProjectSchema.index({ projectType: 1 });
pendingProjectSchema.index({ createTime: -1 });

const PendingProject = mongoose.model('PendingProject', pendingProjectSchema);

module.exports = PendingProject;

