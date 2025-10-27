const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少3个字符']
  },
  password: {
    type: String,
    minlength: [6, '密码至少6个字符']
  },
  displayName: {
    type: String,
    default: function() {
      return this.username;
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  roles: [{
    type: String,
    enum: ['admin', 'manager', 'researcher', 'engineer', 'purchaser', 'processor', 'assembler', 'tester', 'warehouse_in', 'warehouse_out'],
    default: []
  }],
  isPrimaryLeader: {
    type: Boolean,
    default: false
  },
  primaryLeaderRoles: [{
    type: String,
    enum: ['manager', 'researcher', 'engineer', 'purchaser', 'processor', 'assembler', 'tester', 'warehouse_in', 'warehouse_out'],
    default: []
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approver: {
    type: String
  },
  approveTime: {
    type: Date
  },
  createTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt
});

// 保存前加密密码
userSchema.pre('save', async function(next) {
  // 只在密码被修改时才加密
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    if (this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// 验证密码方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// 转换为 JSON 时隐藏密码
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

