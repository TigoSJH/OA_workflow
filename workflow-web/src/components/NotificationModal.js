import React from 'react';
import './NotificationModal.css';

const NotificationModal = ({ notification, onView, onDismiss }) => {
  if (!notification) return null;

  return (
    <div className="notif-overlay">
      <div className="notif-modal">
        <div className="notif-header">通知</div>
        <div className="notif-body">
          <p className="notif-title">{notification.title || '新通知'}</p>
          <p className="notif-message">{notification.message}</p>
        </div>
        <div className="notif-actions">
          <button className="btn-primary" onClick={() => onView(notification)}>立即查看</button>
          <button className="btn-secondary" onClick={() => onDismiss(notification)}>我已知晓</button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;




