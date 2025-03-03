# 易班新媒体中心工作站

易班新媒体中心工作站是一个用于管理团队任务、日程和通知的综合管理系统。系统提供任务分配与追踪、日程规划（鱼骨图视图）、团队信息管理等功能，同时包含一个美观的宣传展示页面。

## 目录

- [系统功能](#系统功能)
- [系统要求](#系统要求)
- [部署指南](#部署指南)
  - [1. 获取代码](#1-获取代码)
  - [2. 安装依赖](#2-安装依赖)
  - [3. 配置环境变量](#3-配置环境变量)
  - [4. 准备图片资源](#4-准备图片资源)
  - [5. 初始化数据库](#5-初始化数据库)
  - [6. 启动服务器](#6-启动服务器)
- [网站入口说明](#网站入口说明)
- [默认管理员账号](#默认管理员账号)
- [系统维护](#系统维护)
- [技术栈](#技术栈)
- [常见问题解决](#常见问题解决)
- [生产环境部署建议](#生产环境部署建议)
- [许可证](#许可证)

## 系统功能

- 🌐 宣传展示首页：展示团队形象、成就和活动
- 📝 任务管理：创建、分配、追踪团队任务
- 📅 日程鱼骨图：直观展示团队日程安排
- 🔔 通知中心：实时获取重要信息
- 👥 用户管理：管理团队成员信息
- 🎨 现代UI：响应式、美观的用户界面
- 🌙 深色模式：支持明/暗主题切换

## 系统要求

部署本系统需要以下环境：

- **Node.js** (版本 14.0.0 或更高)
- **MySQL** (版本 5.7 或更高)
- 现代浏览器 (Chrome, Firefox, Edge, Safari 等)
- 最小配置服务器: 1GB RAM, 1 CPU核心

## 部署指南

### 1. 获取代码

克隆或下载代码到您的服务器：

```bash
git clone https://github.com/your-username/easiban-media-center.git
cd easiban-media-center
```

如果是通过压缩包获取，请解压到您希望的目录，然后通过终端进入该目录。

### 2. 安装依赖

使用npm安装所需依赖：

```bash
npm install
```

这将安装package.json中定义的所有依赖包。

### 3. 配置环境变量

复制示例环境变量文件并修改为您的配置：

```bash
cp .env.example .env
```

然后编辑`.env`文件，填写以下信息：

```
# 服务器配置
PORT=3000                # 服务器运行端口
NODE_ENV=development     # 环境（development 或 production）

# JWT配置
JWT_SECRET=your_secret_key_here  # 用于加密JWT的密钥，请设置为复杂的随机字符串

# 数据库配置
DB_HOST=localhost        # 数据库主机
DB_USER=root             # 数据库用户名
DB_PASSWORD=your_password # 数据库密码
DB_NAME=media_center     # 数据库名称
```

> **重要安全提示**：请确保在生产环境中使用强密钥，并保护好您的`.env`文件。

### 4. 准备图片资源

系统需要一些基本的图片资源才能正常显示：

1. 创建图片资源目录结构：

```bash
mkdir -p public/img/avatars public/img/icons
```

2. 准备以下必要的图片文件：

   - `public/img/logo.png` - 系统Logo (建议尺寸: 200x200px)
   - `public/img/default-avatar.jpg` - 默认用户头像 (建议尺寸: 100x100px)
   - `public/img/hero-bg.jpg` - 首页大图背景 (建议尺寸: 1920x1080px)
   - `public/img/about-image.jpg` - 关于我们图片 (建议尺寸: 800x600px)

   您可以使用提供的 `/public/tools/logo-generator.html` 工具生成简单的Logo和头像。

### 5. 初始化数据库

在MySQL中创建数据库和所需表结构：

```bash
# 通过脚本自动创建（需要输入MySQL密码）
npm run init-db

# 或者手动导入SQL文件
mysql -u root -p < init_database.sql
```

初始化脚本将创建以下内容：
- 数据库：`media_center`（如果不存在）
- 表：`users`, `tasks`, `schedules`, `notifications`
- 默认管理员账号

### 6. 启动服务器

开发环境下启动服务器：

```bash
# 使用nodemon启动（自动重启）
npm run dev

# 或者标准启动
npm start
```

服务器成功启动后，控制台将显示：
```
服务器运行在 http://localhost:3000
```

## 网站入口说明

系统包含两个主要入口：

1. **宣传展示页**：访问 `http://localhost:3000/`
   - 展示团队信息、成就和活动
   - 公开访问，无需登录
   - 包含"登录工作站"按钮，跳转到工作站登录页

2. **工作站系统**：访问 `http://localhost:3000/workstation`
   - 需要登录才能使用的内部管理系统
   - 包含任务管理、日程安排、通知中心等功能

## 默认管理员账号

系统初始化时会创建一个默认管理员账号：

- **用户名**: `admin`
- **密码**: `admin123`

> **安全警告**: 首次登录后请立即修改默认密码！

## 系统维护

### 日常备份

建议定期备份数据库：

```bash
# 备份数据库到文件
mysqldump -u root -p media_center > backup/media_center_`date +%Y%m%d`.sql
```

### 更新系统

```bash
# 获取最新代码
git pull

# 更新依赖
npm install

# 如有数据库结构变更，执行更新脚本
mysql -u root -p media_center < updates/update_vX.X.X.sql

# 重启服务
npm start
```

## 技术栈

### 前端
- HTML5, CSS3, JavaScript
- Bootstrap 5：响应式UI框架
- Chart.js：数据可视化
- Animate.css：动画效果

### 后端
- Node.js
- Express.js：Web应用框架
- MySQL：数据存储
- JWT：身份验证

## 常见问题解决

### 数据库连接错误

**问题**: 服务器启动时显示"无法连接到数据库"

**解决方案**:
1. 确认MySQL服务正在运行
2. 检查`.env`文件中的数据库连接配置
3. 确认用户名和密码正确
4. 确认数据库`media_center`已创建

### JWT身份验证失败

**问题**: 登录后无法访问API

**解决方案**:
1. 检查浏览器控制台是否有错误信息
2. 确认`.env`文件中的JWT_SECRET配置正确
3. 尝试清除浏览器缓存和Cookie
4. 重新登录系统

### 图片无法显示

**问题**: 网站上的图片显示为断裂图标

**解决方案**:
1. 确认`public/img/`目录下是否存在所需图片
2. 检查图片文件名是否与代码中引用的一致（区分大小写）
3. 确保图片格式受浏览器支持（推荐使用.jpg或.png）

## 生产环境部署建议

### 使用进程管理器

推荐使用PM2管理Node.js进程：

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name "media-center"

# 设置开机自启
pm2 startup
pm2 save
```

### 配置反向代理

推荐使用Nginx作为反向代理，以支持HTTPS和负载均衡：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 安全加固

1. 启用HTTPS访问
2. 定期更新依赖包
3. 限制数据库用户权限
4. 配置适当的CORS策略
5. 实施请求速率限制
6. 定期备份数据

## 许可证

MIT - 详情请查看 [LICENSE](LICENSE) 文件
