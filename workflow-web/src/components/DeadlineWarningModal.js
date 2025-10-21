import React from 'react';
import './DeadlineWarningModal.css';

/**
 * 截止日期预警弹窗组件
 * 当项目剩余天数<=3天且用户未提交时显示
 */
const DeadlineWarningModal = ({ project, remainingDays, onOpen, onDismiss }) => {
  if (!project) return null;

  return (
    <div className="deadline-warning-overlay">
      <div className="deadline-warning-modal">
        <div className="deadline-warning-icon">⚠️</div>
        <h2 className="deadline-warning-title">截止日期提醒</h2>
        <div className="deadline-warning-content">
          <p className="deadline-warning-project">
            项目：<strong>{project.projectName}</strong>
          </p>
          <p className="deadline-warning-message">
            还有 <span className="deadline-warning-days">{remainingDays}</span> 天就到预定时间，请及时完成并提交！
          </p>
        </div>
        <div className="deadline-warning-actions">
          <button 
            className="deadline-warning-btn deadline-warning-btn-secondary"
            onClick={onDismiss}
          >
            我已知晓
          </button>
          <button 
            className="deadline-warning-btn deadline-warning-btn-primary"
            onClick={onOpen}
          >
            立即打开
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeadlineWarningModal;

