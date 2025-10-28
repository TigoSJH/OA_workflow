// API服务类 - 处理与后端的通信
class ApiService {
  constructor() {
    // 生产环境使用固定的后端地址，开发环境使用本地地址
    const isProduction = window.location.hostname === 'oa.jjkjoa.top';
    const defaultURL = isProduction 
      ? 'https://api.jjkjoa.top/api'  // 生产环境后端地址
      : `http://${window.location.hostname}:3001/api`;  // 开发环境
    
    this.baseURL = process.env.REACT_APP_API_URL || defaultURL;
    this.token = localStorage.getItem('token');
  }

  // 设置认证令牌
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // 获取认证头
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // 通用请求方法
  async request(url, options = {}) {
    const config = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${url}`, config);
      
      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // 检查是否有响应体
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response;
    } catch (error) {
      console.error('API请求错误:', error);
      
      // 如果是网络错误，提供更友好的错误信息
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('无法连接到服务器，请检查后端服务是否启动');
      }
      
      throw error;
    }
  }

  // GET请求
  async get(url, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    return this.request(fullUrl, { method: 'GET' });
  }

  // POST请求
  async post(url, data = {}) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT请求
  async put(url, data = {}) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE请求
  async delete(url) {
    return this.request(url, { method: 'DELETE' });
  }

  // 文件上传
  async uploadFile(url, formData) {
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('文件上传错误:', error);
      throw error;
    }
  }

  // 文件下载
  async downloadFile(url) {
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('文件下载错误:', error);
      throw error;
    }
  }
}

// 认证相关API
export const authAPI = {
  // 管理员账号密码登录（仅用于 admin）
  login: async (username, password) => {
    const api = new ApiService();
    const response = await api.post('/auth/login', { username, password });
    if (response.token) {
      api.setToken(response.token);
    }
    return response;
  },
  // 发送短信验证码（scene: 'login' | 'register'）
  sendSmsCode: async (phoneNumber, scene = 'login') => {
    const api = new ApiService();
    return api.post('/auth/send-sms-code', { phoneNumber, scene });
  },

  // 短信登录
  loginWithSms: async (phoneNumber, code) => {
    const api = new ApiService();
    const response = await api.post('/auth/login-sms', { phoneNumber, code });
    if (response.token) {
      api.setToken(response.token);
    }
    return response;
  },

  // 短信注册
  registerWithSms: async ({ phoneNumber, code, displayName }) => {
    const api = new ApiService();
    return api.post('/auth/register-sms', { phoneNumber, code, displayName });
  },

  // 获取当前用户信息
  getCurrentUser: async () => {
    const api = new ApiService();
    return api.get('/auth/me');
  },

  // 修改密码
  changePassword: async (oldPassword, newPassword) => {
    const api = new ApiService();
    return api.put('/auth/change-password', { oldPassword, newPassword });
  },

  // 用户登出
  logout: async () => {
    const api = new ApiService();
    const response = await api.post('/auth/logout');
    api.setToken(null);
    return response;
  }
};

// 项目相关API
export const projectAPI = {
  // 获取项目列表
  getProjects: async (params = {}) => {
    const api = new ApiService();
    return api.get('/projects', params);
  },

  // 获取项目详情
  getProject: async (projectId) => {
    const api = new ApiService();
    return api.get(`/projects/${projectId}`);
  },

  // 创建项目
  createProject: async (projectData) => {
    const api = new ApiService();
    return api.post('/projects', projectData);
  },

  // 审批项目
  approveProject: async (projectId, action, comment = '') => {
    const api = new ApiService();
    return api.put(`/projects/${projectId}/approve`, { action, comment });
  },

  // 更新项目
  updateProject: async (projectId, updateData) => {
    const api = new ApiService();
    return api.put(`/projects/${projectId}`, updateData);
  },

  // 删除项目
  deleteProject: async (projectId) => {
    const api = new ApiService();
    return api.delete(`/projects/${projectId}`);
  },
  
  // 团队成员上传图纸（普通成员）
  uploadTeamMemberFiles: async (projectId, files, role = null, category = 'approved') => {
    const api = new ApiService();
    return api.post(`/projects/team-member-upload?category=${category}`, {
      projectId,
      files,
      role  // 传递角色参数
    });
  },

  // 更新团队成员上传状态（标记为已整合）
  updateTeamMemberUploadStatus: async (projectId, uploaderId, updatedFiles, role = null, category = 'approved') => {
    const api = new ApiService();
    return api.post(`/projects/update-team-member-status?category=${category}`, {
      projectId,
      uploaderId,
      files: updatedFiles,
      role  // 传递角色参数
    });
  },

  // 工程师团队成员上传图纸（普通工程师）
  uploadTeamMemberEngineeringFiles: async (projectId, files, category = 'approved') => {
    const api = new ApiService();
    return api.post(`/projects/team-member-engineering-upload?category=${category}`, {
      projectId,
      files
    });
  },

  // 更新工程师团队成员上传状态（标记为已整合）
  updateTeamMemberEngineeringUploadStatus: async (projectId, uploaderId, updatedFiles, category = 'approved') => {
    const api = new ApiService();
    return api.post(`/projects/update-team-member-engineering-status?category=${category}`, {
      projectId,
      uploaderId,
      files: updatedFiles
    });
  }
};

// 任务相关API
export const taskAPI = {
  // 获取任务列表
  getTasks: async (params = {}) => {
    const api = new ApiService();
    return api.get('/tasks', params);
  },

  // 获取任务详情
  getTask: async (taskId) => {
    const api = new ApiService();
    return api.get(`/tasks/${taskId}`);
  },

  // 创建任务
  createTask: async (taskData) => {
    const api = new ApiService();
    return api.post('/tasks', taskData);
  },

  // 更新任务状态
  updateTaskStatus: async (taskId, status, progressPercentage = null, actualHours = null) => {
    const api = new ApiService();
    return api.put(`/tasks/${taskId}/status`, { status, progressPercentage, actualHours });
  },

  // 重新分配任务
  reassignTask: async (taskId, assignedTo) => {
    const api = new ApiService();
    return api.put(`/tasks/${taskId}/reassign`, { assignedTo });
  },

  // 提交任务反馈
  submitFeedback: async (taskId, feedbackType, content) => {
    const api = new ApiService();
    return api.post(`/tasks/${taskId}/feedback`, { feedbackType, content });
  },

  // 推送到下一阶段
  pushToNextStage: async (taskId, nextStage, description = '') => {
    const api = new ApiService();
    return api.post(`/tasks/${taskId}/push-to-next`, { nextStage, description });
  },

  // 更新任务
  updateTask: async (taskId, updateData) => {
    const api = new ApiService();
    return api.put(`/tasks/${taskId}`, updateData);
  },

  // 删除任务
  deleteTask: async (taskId) => {
    const api = new ApiService();
    return api.delete(`/tasks/${taskId}`);
  }
};

// 文件相关API
export const fileAPI = {
  // 上传单个文件到文件系统
  uploadFile: async (file, projectId, projectName, stage = 'other') => {
    const api = new ApiService();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('projectName', projectName);
    formData.append('stage', stage);
    
    return api.uploadFile('/files/upload', formData);
  },

  // 批量上传文件到文件系统
  uploadMultipleFiles: async (files, projectId, projectName, stage = 'other') => {
    const api = new ApiService();
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('projectId', projectId);
    formData.append('projectName', projectName);
    formData.append('stage', stage);
    
    return api.uploadFile('/files/upload-multiple', formData);
  },

  // 获取项目文件列表
  getProjectFiles: async (stage, projectId) => {
    const api = new ApiService();
    return api.get(`/files/list/${stage}/${projectId}`);
  },

  // 下载文件
  downloadFile: async (stage, projectId, filename) => {
    const api = new ApiService();
    const baseURL = api.baseURL.replace('/api', '');
    const url = `${baseURL}/api/files/download/${stage}/${projectId}/${filename}`;
    window.open(url, '_blank');
  },

  // 查看/预览文件
  viewFile: (stage, projectId, filename) => {
    const api = new ApiService();
    const baseURL = api.baseURL.replace('/api', '');
    return `${baseURL}/api/files/view/${stage}/${projectId}/${filename}`;
  },

  // 删除文件
  deleteFile: async (stage, projectId, filename) => {
    const api = new ApiService();
    return api.delete(`/files/${stage}/${projectId}/${filename}`);
  }
};

// 用户相关API
export const userAPI = {
  // 获取用户列表
  getUsers: async (params = {}) => {
    const api = new ApiService();
    return api.get('/users', params);
  },

  // 获取用户详情
  getUser: async (userId) => {
    const api = new ApiService();
    return api.get(`/users/${userId}`);
  },

  // 创建用户
  createUser: async (userData) => {
    const api = new ApiService();
    return api.post('/users', userData);
  },

  // 更新用户信息
  updateUser: async (userId, updateData) => {
    const api = new ApiService();
    return api.put(`/users/${userId}`, updateData);
  },

  // 批准用户
  approveUser: async (userId, roles) => {
    const api = new ApiService();
    return api.put(`/users/${userId}/approve`, { roles });
  },

  // 拒绝用户
  rejectUser: async (userId) => {
    const api = new ApiService();
    return api.put(`/users/${userId}/reject`);
  },

  // 重置用户密码
  resetUserPassword: async (userId, newPassword) => {
    const api = new ApiService();
    return api.put(`/users/${userId}/reset-password`, { newPassword });
  },

  // 删除用户
  deleteUser: async (userId) => {
    const api = new ApiService();
    return api.delete(`/users/${userId}`);
  },

  // 获取用户统计信息
  getUserStats: async () => {
    const api = new ApiService();
    return api.get('/users/stats/overview');
  },

  // 获取用户角色列表
  getUserRoles: async () => {
    const api = new ApiService();
    return api.get('/users/roles/list');
  },

  // 获取用户状态列表
  getUserStatuses: async () => {
    const api = new ApiService();
    return api.get('/users/status/list');
  },

  // 获取主负责人列表
  getPrimaryLeaders: async () => {
    const api = new ApiService();
    return api.get('/users/primary-leaders/list');
  },

  // 设置主负责人
  setPrimaryLeader: async (userId, roles) => {
    const api = new ApiService();
    return api.post('/users/primary-leaders/set', { userId, roles });
  },

  // 移除主负责人
  removePrimaryLeader: async (userId, roles = []) => {
    const api = new ApiService();
    return api.post('/users/primary-leaders/remove', { userId, roles });
  }
};

// 通知相关API
export const notificationAPI = {
  // 获取通知列表
  getNotifications: async (params = {}) => {
    const api = new ApiService();
    return api.get('/notifications', params);
  },

  // 获取未读通知数量
  getUnreadCount: async () => {
    const api = new ApiService();
    return api.get('/notifications/unread-count');
  },

  // 获取通知详情
  getNotification: async (notificationId) => {
    const api = new ApiService();
    return api.get(`/notifications/${notificationId}`);
  },

  // 标记通知为已读
  markAsRead: async (notificationId) => {
    const api = new ApiService();
    return api.put(`/notifications/${notificationId}/read`);
  },

  // 批量标记通知为已读
  markBatchAsRead: async (notificationIds) => {
    const api = new ApiService();
    return api.put('/notifications/batch/read', { notificationIds });
  },

  // 标记所有通知为已读
  markAllAsRead: async () => {
    const api = new ApiService();
    return api.put('/notifications/all/read');
  },

  // 删除通知
  deleteNotification: async (notificationId) => {
    const api = new ApiService();
    return api.delete(`/notifications/${notificationId}`);
  },

  // 批量删除通知
  deleteBatchNotifications: async (notificationIds) => {
    const api = new ApiService();
    return api.delete('/notifications/batch', { notificationIds });
  },

  // 获取通知统计信息
  getNotificationStats: async () => {
    const api = new ApiService();
    return api.get('/notifications/stats/overview');
  },

  // 获取通知类型列表
  getNotificationTypes: async () => {
    const api = new ApiService();
    return api.get('/notifications/types/list');
  },

  // 获取通知状态列表
  getNotificationStatuses: async () => {
    const api = new ApiService();
    return api.get('/notifications/status/list');
  }
};

// 导出API服务实例
export const apiService = new ApiService();

// 导出所有API
export default {
  auth: authAPI,
  project: projectAPI,
  task: taskAPI,
  file: fileAPI,
  user: userAPI,
  notification: notificationAPI
};
