import React, { useState, useEffect } from 'react';
import './Register.css';
import { authAPI } from '../services/api';

const Register = ({ onBackToLogin, onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    displayName: '',
    phoneNumber: '',
    code: ''
  });
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSendCode = async () => {
    if (!formData.phoneNumber) {
      console.warn('请填写手机号');
      return;
    }
    const reCN = /^(\+?86)?1[3-9]\d{9}$/;
    if (!reCN.test(formData.phoneNumber)) {
      console.warn('请输入有效的中国大陆手机号');
      return;
    }
    try {
      setLoading(true);
      await authAPI.sendSmsCode(formData.phoneNumber, 'register');
      setCountdown(60);
    } catch (e) {
      console.error('发送验证码失败：', e.message || e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.displayName) {
      console.warn('请填写姓名');
      setLoading(false);
      return;
    }
    if (!formData.phoneNumber) {
      console.warn('请填写手机号');
      setLoading(false);
      return;
    }
    const reCN = /^(\+?86)?1[3-9]\d{9}$/;
    if (!reCN.test(formData.phoneNumber)) {
      console.warn('请输入有效的中国大陆手机号');
      setLoading(false);
      return;
    }

    if (!formData.code) {
      console.warn('请填写验证码');
      setLoading(false);
      return;
    }

    try {
      await authAPI.registerWithSms({
        phoneNumber: formData.phoneNumber,
        code: formData.code,
        displayName: formData.displayName
      });
      alert('注册成功！\n\n请等待管理员批准和安排职位后再使用系统，并使用手机号+验证码登录。');
      onRegisterSuccess();
    } catch (error) {
      console.error('注册失败：', error.message || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <div className="register-header">
          <div className="robot-icon">🦾</div>
          <h1 className="register-title">用户注册</h1>
          <p className="register-subtitle">工业工作流管理系统</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="input-group">
            <span className="input-icon">👤</span>
            <input
              type="text"
              name="displayName"
              placeholder="姓名"
              value={formData.displayName}
              onChange={handleChange}
              required
              disabled={loading}
              className="register-input"
            />
          </div>

          <div className="input-group">
            <span className="input-icon">📱</span>
            <input
              type="tel"
              name="phoneNumber"
              placeholder="手机号"
              value={formData.phoneNumber}
              onChange={handleChange}
              disabled={loading}
              className="register-input"
            />
          </div>

          <div className="input-group">
            <span className="input-icon">🔑</span>
            <input
              type="text"
              name="code"
              placeholder="短信验证码"
              value={formData.code}
              onChange={handleChange}
              disabled={loading}
              className="register-input"
            />
            <button type="button" className="toggle-password" onClick={handleSendCode} disabled={loading || countdown > 0}>
              {countdown > 0 ? `${countdown}s` : '获取验证码'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="register-button"
          >
            {loading ? '注册中...' : '注册'}
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            className="back-to-login-button"
            disabled={loading}
          >
            已有账号？返回登录
          </button>
        </form>

        <div className="register-notice-info">
          <span className="info-icon">ℹ️</span>
          <div className="info-content">
            <div className="info-title">注册说明</div>
            <div className="info-details">
              <div>• 注册后需等待管理员审批</div>
              <div>• 审批通过后管理员会分配职位</div>
              <div>• 请确保信息真实有效</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;



