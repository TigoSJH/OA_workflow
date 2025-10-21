const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: { // new_project, approve_result 等
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  // 关联项目
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApprovedProject'
  },
  // 收件人
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 发送人
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  requiresAction: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

notificationSchema.index({ toUserId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);




