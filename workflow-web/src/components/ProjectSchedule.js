import React, { useState, useEffect } from 'react';
import './ProjectSchedule.css';
import RoleBadges from './RoleBadges';
import Toast from './Toast';
import { apiService } from '../services/api';

const ProjectSchedule = ({ user, onLogout, projectId, onComplete, activeRole, onRoleSwitch }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showExceedModal, setShowExceedModal] = useState(false);
  const [exceedInfo, setExceedInfo] = useState({ plannedDays: 0, allowedDays: 0 });
  const [timelines, setTimelines] = useState({
    researcherTime: 0,
    engineerTime: 0,
    purchaserTime: 0,
    processorTime: 0,
    assemblerTime: 0,
    testerTime: 0
  });

  // 加载项目详情
  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/projects');
      
      console.log('查找项目ID:', projectId);
      console.log('所有项目:', response.projects.map(p => ({ id: p.id, name: p.projectName, category: p.category })));
      
      // 使用字符串比较，确保类型一致
      const foundProject = response.projects.find(p => String(p.id) === String(projectId));
      
      console.log('找到的项目:', foundProject);
      
      if (foundProject) {
        setProject(foundProject);
        
        // 如果项目已经设置了时间周期，则加载现有数据
        if (foundProject.timelines) {
          setTimelines({
            researcherTime: foundProject.timelines.researcherTime || 0,
            engineerTime: foundProject.timelines.engineerTime || 0,
            purchaserTime: foundProject.timelines.purchaserTime || 0,
            processorTime: foundProject.timelines.processorTime || 0,
            assemblerTime: foundProject.timelines.assemblerTime || 0,
            testerTime: foundProject.timelines.testerTime || 0
          });
        }
      } else {
        console.error('未找到项目，projectId:', projectId, '类型:', typeof projectId);
      }
    } catch (error) {
      console.error('加载项目失败:', error);
      alert('加载项目失败：' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (role, value) => {
    setTimelines(prev => ({
      ...prev,
      [`${role}Time`]: parseInt(value) || 0
    }));
  };

  const parseTotalMonths = () => {
    // 优先使用通用 duration，其次使用立项/合同各自的时长
    const raw = project?.duration || project?.researchDuration || project?.contractDuration;
    const months = parseInt(raw, 10);
    return Number.isFinite(months) ? months : 0;
  };

  const calculateAllowedDays = () => {
    const totalMonths = parseTotalMonths();
    if (!totalMonths || totalMonths <= 0) return null;

    const start = new Date(project?.approveTime || project?.createTime || project?.createdAt || Date.now());
    if (Number.isNaN(start.getTime())) return null;

    // 以真实日历月份计算：起始日期 + N 个月，再取日期差
    const end = new Date(start);
    end.setMonth(end.getMonth() + totalMonths);
    const diffMs = end.getTime() - start.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const calculatePlannedDays = () => {
    const values = [
      timelines.researcherTime,
      timelines.engineerTime,
      timelines.purchaserTime,
      timelines.processorTime,
      timelines.assemblerTime,
      timelines.testerTime
    ];
    return values.reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
  };

  const handleSubmit = async () => {
    try {
      // 提交前校验：各部门总天数不能超过总周期（以真实月份换算为天数）
      const plannedDays = calculatePlannedDays();
      const allowedDays = calculateAllowedDays();
      if (allowedDays !== null && plannedDays > allowedDays) {
        setExceedInfo({ plannedDays, allowedDays });
        setShowExceedModal(true);
        return;
      }

      setSaving(true);
      await apiService.post('/projects/timelines/set', {
        projectId: project.id,
        timelines: timelines
      });
      
      // 显示成功提示
      setShowToast(true);
      
      // 1秒后自动返回到项目周期管理首页
      setTimeout(() => {
        setShowToast(false);
        onComplete();
      }, 1000);
    } catch (error) {
      console.error('设置时间周期失败:', error);
      alert('设置时间周期失败：' + (error.message || '未知错误'));
      setSaving(false);
    }
  };

  const roleMap = {
    researcher: '研发',
    engineer: '工程出图',
    purchaser: '采购',
    processor: '加工',
    assembler: '装配',
    tester: '调试'
  };

  if (loading) {
    return (
      <div className="schedule-container">
        <div className="loading-message">加载中...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="schedule-container">
        <div className="error-message">项目不存在</div>
      </div>
    );
  }

  return (
    <div className="schedule-container">
      {/* 顶部导航栏 */}
      <div className="schedule-header">
        <div className="header-left">
          <div className="user-info">
            <div className="user-avatar">👨‍💼</div>
            <div className="user-details">
              <div className="user-name">
                {user.displayName || user.username}
                {user.isPrimaryLeader && user.primaryLeaderRoles && 
                 user.primaryLeaderRoles.includes('manager') && (
                  <span className="primary-leader-badge">（主负责人）</span>
                )}
              </div>
              <RoleBadges 
                user={user} 
                activeRole={activeRole} 
                onRoleSwitch={onRoleSwitch} 
              />
            </div>
          </div>
        </div>
        <div className="header-right">
          <button className="back-btn" onClick={onComplete}>
            ← 返回
          </button>
          <button className="logout-btn" onClick={onLogout}>
            🚪 退出登录
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="schedule-content">
        <div className="schedule-card">
          <h2 className="schedule-title">项目时间周期设置</h2>
          <div className="project-info">
            <h3 className="project-name">{project.projectName}</h3>
            <p className="project-description">{project.description}</p>
          </div>

          <div className="timeline-form">
            <p className="form-hint">请为各岗位设置项目时间周期（单位：日）</p>
            
            {Object.keys(roleMap).map(role => (
              <div key={role} className="form-group">
                <label className="form-label">
                  {roleMap[role]}时间：
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={timelines[`${role}Time`]}
                  onChange={(e) => handleTimeChange(role, e.target.value)}
                  placeholder="请输入天数"
                />
                <span className="form-unit">天</span>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button 
              className="btn-cancel" 
              onClick={onComplete}
              disabled={saving}
            >
              取消
            </button>
            <button 
              className="btn-submit" 
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? '保存中...' : '保存并下发项目'}
            </button>
          </div>
        </div>
      </div>

      {/* 成功提示浮窗 */}
      {showToast && (
        <Toast 
          message="项目时间周期设置成功，已下发给相关人员！" 
          type="success"
          onClose={() => setShowToast(false)}
          duration={1000}
        />
      )}

      {/* 超出总周期提示弹窗 */}
      {showExceedModal && (
        <div className="exceed-overlay">
          <div className="exceed-modal">
            <div className="exceed-icon">⚠️</div>
            <h2 className="exceed-title">时间安排超出总周期</h2>
            <div className="exceed-content">
              <p>
                当前各部门合计 <strong>{exceedInfo.plannedDays}</strong> 天，超过总周期允许的 <strong>{exceedInfo.allowedDays}</strong> 天。
              </p>
              <p>请调整各部门的时间后再提交。</p>
            </div>
            <div className="exceed-actions">
              <button className="exceed-btn" onClick={() => setShowExceedModal(false)}>我已知晓</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSchedule;

