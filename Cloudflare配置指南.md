# 使用 Cloudflare Zero Trust 保护内部应用（OA系统）访问指南

本文档将指导您如何使用 Cloudflare 的免费 Zero Trust 服务，为内部的 OA 工作流网页或其他应用提供一个安全、无需公网 IP 的远程访问方案。

该方案的核心优势：
- **极致安全**：您的服务器无需暴露任何端口到公网，杜绝网络攻击。
- **完全免费**：Cloudflare 的免费套餐支持多达50个用户。
- **无需改动代码**：现有应用无需任何修改。
- **体验良好**：员工通过浏览器即可访问，无需安装VPN客户端。

---

## 整体流程概览

1.  **准备工作**：注册一个属于您自己的域名。
2.  **Cloudflare 配置**：将域名托管至 Cloudflare，并创建安全隧道和访问策略。
3.  **服务器配置**：在您的 OA 服务器上安装 Cloudflare 连接器。

---

## 第一步：准备工作 - 购买域名

这是整个方案的唯一花费点，通常非常便宜（每年几十元人民币）。Cloudflare 的服务是基于域名的，所以这是必需步骤。

### 操作步骤

1.  **选择域名注册商**：
    *   推荐 `Porkbun.com`, `Namesilo.com` (国外，便宜) 或阿里云、腾讯云 (国内)。
2.  **购买域名**：
    *   选择一个简单好记的域名，例如 `your-company-name.xyz`。`.xyz`、`.top` 等后缀的域名通常一年只需要10-20元。
    *   **请注意**：此域名仅用于内部系统访问地址，**无需网站备案**。
3.  **完成支付**：根据注册商的指引完成购买流程。

---

## 第二步：Cloudflare 网站配置

这是最核心的步骤，请仔细操作。

### 操作步骤

1.  **注册并登录 Cloudflare**：
    *   访问 `dash.cloudflare.com` 注册一个免费账号并登录。

2.  **添加您的域名**：
    *   在主界面点击“添加站点 (Add a Site)”，输入您刚刚购买的域名。
    *   选择最下方的 **Free (免费)** 套餐并继续。
    *   Cloudflare 会扫描 DNS 记录，直接点击继续即可。
    *   **关键操作**：Cloudflare 会提供两个**名称服务器 (Nameservers)** 地址。请完整复制这两个地址。
      ```
      例如:
      dane.ns.cloudflare.com
      vera.ns.cloudflare.com
      ```
      alex.ns.cloudflare.com
      aron.ns.cloudflare.com


3.  **修改域名的名称服务器**：
    *   回到您**购买域名的网站**（如 Porkbun、阿里云等）。
    *   进入该域名的管理后台，找到“修改名称服务器”或“DNS服务器设置”的选项。
    *   将默认的名称服务器地址**替换**为上一步从 Cloudflare 复制的两个地址，然后保存。
    *   **等待生效**：此过程可能需要几分钟到几小时。您可以在 Cloudflare 网站上点击“完成，检查名称服务器”按钮来刷新状态。当看到成功提示时，即可进行下一步。

4.  **创建安全访问隧道 (Tunnel)**：
    *   在 Cloudflare 左侧主菜单中，找到并点击 **Zero Trust**，进入 Zero Trust 管理仪表板。
    *   在 Zero Trust 左侧菜单中，选择 **Networks -> Tunnels**。
    *   点击 **Create a tunnel** (创建隧道)。
    *   给隧道起一个名字（例如 `oa-tunnel`），然后点击 **Save tunnel**。

5.  **获取并保存连接器安装命令**：
    *   在接下来的页面中，选择您 OA 服务器的操作系统（如 `Windows`, `Linux (Debian/RPM)` 等）。
    *   Cloudflare 会为您生成一段**唯一的安装命令**。**请务必完整复制并妥善保存这段命令**，稍后在服务器上需要用到。
      ```
      // 命令示例，请使用您自己页面上生成的那个
      cloudflared.exe service install eyJhIjoiYWExMm....NzU2ZCJ9
      ```

6.  **将隧道连接到您的OA服务**：
    *   在隧道配置页面，点击 **Public Hostnames** 标签页。
    *   点击 **Add a public hostname** (添加公共主机名)。
    *   **Subdomain (子域名)**: 输入 `oa` (或其他您喜欢的名字)。
    *   **Domain (域名)**: 选择您的域名。最终访问地址将是 `oa.yourcompany.com`。
    *   **Service -> Type**: 选择 `HTTP`。
    *   **Service -> URL**: 输入您 OA 系统的**内网地址**。例如，如果服务器IP是 `192.168.1.100`，端口是 `8080`，就填写 `http://192.168.1.100:8080`。如果是本机，可以填写 `http://localhost:8080`。
    *   点击 **Save hostname**。

7.  **创建访问策略（决定谁可以访问）**：
    *   在 Zero Trust 左侧菜单中，选择 **Access -> Applications**。
    *   点击 **Add an application**，类型选择 **Self-hosted**。
    *   **Application name**: 任意填写，例如 `公司OA系统`。
    *   **Application domain**: 选择上一步创建的 `oa.yourcompany.com`。
    *   点击 **Next**。
    *   **Policy name**: 任意填写，例如 `员工访问规则`。
    *   **Action**: 选择 `Allow` (允许)。
    *   **Configure rules (配置规则)**:
        *   在 **Include** 区域，从下拉菜单中选择 `Emails ending in`。
        *   在右侧文本框输入您公司的**邮箱后缀** (例如 `@your-company.com`)。
        *   如果您没有统一的公司邮箱，可以选择 `Emails`，然后逐个输入允许访问的员工邮箱地址。
    *   点击 **Next**，然后点击 **Add application**。

---

## 第三步：在您的OA服务器上配置

这是最后一步，让服务器与 Cloudflare 建立连接。

### 操作步骤

1.  **登录您的OA服务器**。
2.  **确保服务器可以访问互联网**。
3.  **安装连接器**：
    *   打开命令行工具（Windows 使用 **PowerShell (管理员)** 或 **CMD (管理员)**；Linux 使用终端）。
    *   粘贴并运行您在 **第二步第5点** 保存的那段 `cloudflared` 安装命令。
    *   命令会自动完成下载、安装和后台服务启动。

---

## 完成！如何使用？

### 员工访问流程

1.  **打开浏览器**：在任何有网络的地方，打开任意浏览器。
2.  **输入访问地址**：输入您设定的地址，例如 `https://oa.yourcompany.com`。
3.  **邮箱验证**：Cloudflare 会显示一个登录页面。员工需要输入他们的邮箱地址（必须是您在策略中允许的邮箱）。
4.  **接收并输入验证码**：Cloudflare 会向该邮箱发送一个一次性验证码。
5.  **成功访问**：输入验证码后，即可看到并正常使用您的 OA 系统。

### (推荐) 优化员工体验：延长登录会话

为了避免员工每次都要验证，可以延长登录的有效期。

1.  进入 **Cloudflare Zero Trust** 仪表板。
2.  左侧菜单选择 **Settings -> Authentication**。
3.  找到 **Login session duration**，点击 **Edit**。
4.  选择一个更长的时间，例如 **One week (一周)** 或 **One month (一个月)**。

这样，员工在一个月内使用同一台设备和浏览器访问，只需要验证一次。
