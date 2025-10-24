import React, { useState, useEffect } from 'react';
import './Login.css';
import { authAPI } from '../services/api';

const Login = ({ onLogin, onShowRegister }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [adminMode, setAdminMode] = useState(false);
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phoneNumber) {
      alert('请填写手机号');
      return;
    }
    // 简单校验内地手机号
    const reCN = /^(\+?86)?1[3-9]\d{9}$/;
    if (!reCN.test(phoneNumber)) {
      alert('请输入有效的中国大陆手机号');
      return;
    }
    try {
      setLoading(true);
      await authAPI.sendSmsCode(phoneNumber, 'login');
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

    try {
      let response;
      if (adminMode) {
        response = await authAPI.login(adminUsername, adminPassword);
      } else {
        // 登录前手机号格式校验
        const reCN = /^(\+?86)?1[3-9]\d{9}$/;
        if (!reCN.test(phoneNumber)) {
          throw new Error('请输入有效的中国大陆手机号');
        }
        response = await authAPI.loginWithSms(phoneNumber, code);
      }
      
      // 登录成功，token 已经在 authAPI.login 中自动保存到 localStorage
      onLogin(response.user);
    } catch (error) {
      const msg = error.message || '登录失败，请检查输入信息';
      if (msg.includes('待审批') || msg.includes('未激活')) {
        alert('账号待审批，请等待管理员批准后再登录');
      } else {
        alert(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img className="login-logo" src="/logo.jfif" alt="系统Logo" />
          <h1 className="login-title">解匠OA工作流程</h1>
          <p className="login-subtitle">现场管理系统</p>
        </div>

        <div className="login-top-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            type="button"
            className="register-link-button"
            onClick={() => setAdminMode(!adminMode)}
            disabled={loading}
            title={adminMode ? '切换到短信登录' : '切换到管理员登录'}
          >
            {adminMode ? '← 返回短信登录' : '管理员登录' }
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {adminMode ? (
            <>
              <div className="input-group">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  placeholder="管理员用户名"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="login-input"
                />
              </div>
              <div className="input-group">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  placeholder="管理员密码"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="login-input"
                />
              </div>
            </>
          ) : (
            <>
          <div className="input-group">
            <span className="input-icon">📱</span>
            <input
              type="tel"
              placeholder="手机号"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              disabled={loading}
              className="login-input"
            />
          </div>

          <div className="input-group">
            <span className="input-icon">🔑</span>
            <input
              type="text"
              placeholder="短信验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              disabled={loading}
              className="login-input"
            />
            <button type="button" className="toggle-password" onClick={handleSendCode} disabled={loading || countdown > 0}>
              {countdown > 0 ? `${countdown}s` : '获取验证码'}
            </button>
          </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? '登录中...' : adminMode ? '管理员登录' : '短信登录'}
          </button>

          {!adminMode && (
            <button
              type="button"
              onClick={onShowRegister}
              className="register-link-button"
              disabled={loading}
            >
              还没有账号？点击注册
            </button>
          )}
        </form>

        <div className="test-account-info">
          <span className="info-icon">ℹ️</span>
          <div className="info-content">
            <div className="info-title">登录提示</div>
            <div className="info-details">
              {adminMode ? '仅管理员使用账号密码登录' : '普通用户使用手机号 + 短信验证码登录'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;