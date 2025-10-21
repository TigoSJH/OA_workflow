# Tailscale VPN 配置指南

## 📋 配置步骤

### 第一步：服务器端（你的电脑）

#### 1. 注册和下载
- 访问：https://tailscale.com/
- 注册账号（用 Google/Microsoft/GitHub 账号）
- 下载 Windows 客户端：https://tailscale.com/download/windows

#### 2. 安装和登录
1. 双击安装包安装
2. 安装完成后点击系统托盘的 Tailscale 图标
3. 点击 "Log in" 登录
4. 浏览器授权设备

#### 3. 查看 Tailscale IP
安装登录后，点击 Tailscale 图标可以看到你的 IP 地址（格式：100.x.x.x）

**或者通过命令查看**：
```powershell
tailscale ip -4
```

**或者访问管理后台**：
https://login.tailscale.com/admin/machines

**记下你的 Tailscale IP，例如：100.101.102.103**

---

### 第二步：工厂端（工厂的电脑）

**每台需要访问的电脑都要安装**：

1. 下载 Tailscale：https://tailscale.com/download/windows
2. 安装客户端
3. **用同一个账号登录**（服务器端的账号）
4. 授权设备

**测试连接**：
```powershell
# 在工厂的电脑上 ping 服务器的 Tailscale IP
ping 100.101.102.103
```

如果能 ping 通，说明 VPN 连接成功！

---

### 第三步：配置项目（服务器端操作）

#### 1. 修改前端 API 地址

**文件位置**：`workflow-web/src/services/api.js`

**修改内容**（第 4 行）：
```javascript
// 改为你的 Tailscale IP
this.baseURL = process.env.REACT_APP_API_URL || 'http://100.101.102.103:3001/api';
```

#### 2. 重启前端服务

停止前端（Ctrl + C），然后重新启动：
```powershell
cd E:\workflow-web-main\workflow-web-main\workflow-web
npm start
```

---

### 第四步：工厂端访问

工厂的人在浏览器打开：
```
http://100.101.102.103:3000
```

**登录信息**：
- 用户名：admin
- 密码：123456

---

## ✅ 完整检查清单

**服务器端（你）**：
- [ ] 安装 Tailscale
- [ ] 登录账号
- [ ] 记下 Tailscale IP（100.x.x.x）
- [ ] 修改 api.js 中的 IP 地址
- [ ] 重启前端服务
- [ ] 确保 MongoDB 和后端服务正在运行

**工厂端（每台电脑）**：
- [ ] 安装 Tailscale
- [ ] 用同一个账号登录
- [ ] ping 服务器 IP 测试连接
- [ ] 浏览器访问 http://100.x.x.x:3000

---

## 🔧 常见问题

### Q1: 工厂电脑无法 ping 通服务器
**解决**：
1. 确认双方都登录了同一个 Tailscale 账号
2. 检查 Tailscale 是否显示 "Connected"
3. 检查防火墙设置

### Q2: 可以 ping 通但无法访问网页
**解决**：
1. 确认服务器端项目正在运行
2. 检查 Windows 防火墙规则（需要允许 3000 和 3001 端口）
3. 在服务器上用 Tailscale IP 自己测试一下：http://100.x.x.x:3000

### Q3: Tailscale 连接很慢
**解决**：
1. Tailscale 会自动选择最快的路径
2. 可以在管理后台启用 DERP 中继服务器
3. 检查网络环境

---

## 💡 优势

- ✅ 安全：点对点加密
- ✅ 简单：双方都安装客户端即可
- ✅ 稳定：自动选择最佳路径
- ✅ 免费：20 设备内完全免费

---

## 📞 需要帮助？

1. 记下你的 Tailscale IP
2. 告诉我遇到的问题
3. 我来帮你解决！

---

## 🎯 下一步

安装好 Tailscale 后，告诉我你的 Tailscale IP（100.x.x.x），我帮你修改项目配置！


