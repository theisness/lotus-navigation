# 实现计划：导航门户全栈升级

## 概述

将现有 React 前端导航门户升级为全栈项目，分为后端搭建、前端改造两大阶段，逐步实现用户认证、导航项管理、图片上传、动态首页等功能。

## 任务

- [x] 1. 搭建后端项目基础结构
  - [x] 1.1 初始化 backend 目录，创建 package.json，安装依赖（express, mongoose, redis, jsonwebtoken, bcryptjs, multer, nodemailer, uuid, cors）
    - 创建 `backend/package.json`
    - 创建 `backend/config.json` 配置文件（MongoDB URL、Redis、JWT、邮箱配置）
    - _Requirements: 8.2_
  - [x] 1.2 创建 Express 应用入口 `backend/app.js`
    - 连接 MongoDB 和 Redis
    - 配置 CORS、JSON 解析、静态文件服务（images/）
    - 挂载路由
    - _Requirements: 8.3, 8.5_
  - [x] 1.3 创建数据模型 `backend/models/User.js` 和 `backend/models/NavItem.js`
    - User: email, password, is_admin, created_at
    - NavItem: url, title, description, emoji, display_mode, is_public, user_id, bg_image, created_at
    - _Requirements: 3.6, 8.1_

- [x] 2. 实现用户认证模块
  - [x] 2.1 创建认证中间件 `backend/middleware/auth.js`
    - 实现 authMiddleware（JWT 验证，提取 userId）
    - 实现 optionalAuthMiddleware（可选 JWT，未登录时 req.user 为 null）
    - 实现 adminMiddleware（检查 is_admin）
    - _Requirements: 2.3, 2.4_
  - [x] 2.2 创建 `backend/services/authService.js`
    - 实现 generateCode()：生成6位数字验证码
    - 实现 sendVerificationCode(email)：检查60秒限制 → 存入 Redis（5分钟过期）→ 发送邮件
    - 实现 register(email, password, code)：验证验证码 → 检查邮箱唯一性 → bcrypt 加密密码 → 创建用户
    - 实现 login(email, password)：验证凭证 → 生成 JWT
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2_
  - [x] 2.3 创建 `backend/controllers/authController.js` 和 `backend/routes/auth.js`
    - POST /api/auth/send-code
    - POST /api/auth/register
    - POST /api/auth/login
    - GET /api/auth/me
    - _Requirements: 1.1, 1.4, 2.1_
  - [ ]* 2.4 编写认证模块属性测试
    - **Property 1: 验证码格式正确性** — 生成的验证码应为恰好6位纯数字字符串
    - **Validates: Requirements 1.1**
    - **Property 4: JWT 认证往返一致性** — 登录返回的 JWT 应能被中间件正确解析出 userId
    - **Validates: Requirements 2.1, 2.3**
    - **Property 6: 无效 JWT 返回401** — 格式错误或过期的 JWT 应被拒绝
    - **Validates: Requirements 2.4**
  - [ ]* 2.5 编写认证模块单元测试
    - 测试60秒频率限制（Property 2, Requirements 1.3）
    - 测试错误验证码拒绝注册（Property 3, Requirements 1.5）
    - 测试错误凭证拒绝登录（Property 5, Requirements 2.2）
    - 测试邮箱重复注册（edge-case, Requirements 1.6）

- [x] 3. 实现导航项管理模块
  - [x] 3.1 创建 `backend/services/navItemService.js`
    - 实现 getNavItems(userId)：未登录返回公共项；已登录返回公共项 + 用户私有项
    - 实现 createNavItem(data, user)：验证权限（普通用户不能创建公共项）→ 创建导航项
    - 实现 deleteNavItem(itemId, user)：验证所有权 → 删除
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 3.2 创建 `backend/controllers/navItemController.js` 和 `backend/routes/navItem.js`
    - GET /api/nav-items（optionalAuth）
    - POST /api/nav-items（auth）
    - DELETE /api/nav-items/:id（auth）
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 3.3 编写导航项模块属性测试
    - **Property 7: 导航项可见性规则** — 已登录用户获取公共项+私有项，未登录仅获取公共项
    - **Validates: Requirements 3.1, 3.2, 3.4**
    - **Property 8: 普通用户无法创建公共项** — is_admin 为 false 的用户创建公共项应被拒绝
    - **Validates: Requirements 3.5**
    - **Property 13: 必填字段验证** — 缺少 url 或 title 的请求应被拒绝
    - **Validates: Requirements 7.4**

- [x] 4. 实现图片上传模块
  - [x] 4.1 创建 `backend/services/uploadService.js` 和 `backend/controllers/uploadController.js` 和 `backend/routes/upload.js`
    - 使用 multer 配置文件上传
    - 验证文件格式（jpg, jpeg, png, gif, webp）
    - 使用 uuid 生成随机文件名
    - 保存到 backend/images/
    - POST /api/upload/image（auth）
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 4.2 编写上传模块属性测试
    - **Property 9: 上传文件名唯一性** — 两次上传生成的文件名应互不相同
    - **Validates: Requirements 4.1**
    - **Property 10: 非图片格式拒绝上传** — 非 jpg/jpeg/png/gif/webp 扩展名应被拒绝
    - **Validates: Requirements 4.3**

- [ ] 5. 检查点 - 后端功能验证
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 6. 前端 API 层与认证状态管理
  - [x] 6.1 创建 `frontend/src/api.js`
    - 封装 axios/fetch 请求，自动附加 JWT token
    - 导出 authApi（sendCode, register, login, getMe）
    - 导出 navApi（getNavItems, createNavItem, deleteNavItem）
    - 导出 uploadApi（uploadImage）
    - _Requirements: 2.1, 3.1_
  - [x] 6.2 配置 Vite 代理，将 `/api` 请求转发到后端 `http://localhost:3001`
    - 修改 `frontend/vite.config.js`

- [x] 7. 前端认证组件
  - [x] 7.1 创建 `frontend/src/components/AuthForm.jsx` 和对应 CSS Module
    - 模态框形式，支持登录/注册模式切换
    - 登录：邮箱 + 密码
    - 注册：邮箱 + 密码 + 验证码（发送按钮 + 60秒倒计时）
    - _Requirements: 1.1, 1.3, 1.4, 2.1_

- [x] 8. 前端主页与导航卡片
  - [x] 8.1 创建 `frontend/src/components/NavCard.jsx` 和对应 CSS Module
    - 大图卡片组件：背景图 + 标题 + 描述 + emoji logo
    - 点击行为根据 display_mode 区分（iframe/新标签页）
    - _Requirements: 5.2, 5.3, 5.4_
  - [x] 8.2 创建 `frontend/src/pages/Homepage.jsx` 和对应 CSS Module
    - 顶部用户信息栏（登录按钮/用户邮箱+登出）
    - 已登录时显示"添加导航"按钮
    - 网格布局展示 NavCard 列表
    - _Requirements: 5.1, 5.2, 5.5_
  - [ ]* 8.3 编写导航卡片渲染属性测试
    - **Property 11: 导航卡片渲染完整性** — 卡片应包含背景图、标题和描述
    - **Validates: Requirements 5.2**

- [x] 9. 前端添加导航项表单
  - [x] 9.1 创建 `frontend/src/components/AddNavForm.jsx` 和对应 CSS Module
    - 模态框表单：地址、标题、描述、emoji logo、显示模式、背景图片上传
    - 管理员额外显示"公共项目"开关
    - 前端必填字段验证（地址、标题）
    - _Requirements: 7.1, 7.2, 7.4_

- [x] 10. 改造 Sidebar 和 Portal 组件
  - [x] 10.1 改造 `frontend/src/components/Sidebar.jsx`
    - 替换硬编码 siteInfo 为动态导航列表 props
    - 点击"莲花导航"标题触发切换到主页视图
    - 根据 display_mode 决定点击行为（iframe/新标签页）
    - 每个导航项显示 emoji logo 和标题
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 10.2 改造 `frontend/src/pages/Portal.jsx`
    - 管理全局状态：当前视图（homepage/iframe）、用户登录状态、导航列表、选中的导航项
    - 登录后请求后端获取导航列表
    - 将导航列表传递给 Sidebar 和 Homepage
    - 集成 AuthForm 和 AddNavForm 模态框
    - 添加/删除导航项后刷新列表
    - _Requirements: 5.1, 5.4, 6.1, 7.3_
  - [ ]* 10.3 编写侧边栏渲染属性测试
    - **Property 12: 侧边栏导航项渲染完整性** — 侧边栏应显示 emoji logo 和标题
    - **Validates: Requirements 6.5**

- [ ] 11. 最终检查点 - 全栈集成验证
  - 确保所有测试通过，如有问题请向用户确认。
