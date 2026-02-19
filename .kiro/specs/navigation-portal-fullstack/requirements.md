# 需求文档

## 简介

将现有的 React 导航门户应用升级为全栈项目。前端保留侧边栏导航布局，新增用户认证、动态导航管理功能；后端使用 Node.js/Express + MongoDB + Redis，提供用户管理、导航项 CRUD、图片上传、邮箱验证码注册等 API。首页以大图卡片形式展示导航项，提升视觉冲击力。

## 术语表

- **Portal（门户）**: 整个导航网站应用
- **Navigation_Item（导航项）**: 数据库中存储的网站条目，包含地址、标题、描述、emoji logo、背景图、显示模式、公私属性等
- **Auth_Service（认证服务）**: 后端负责用户注册、登录、验证码发送的服务模块
- **Navigation_Service（导航服务）**: 后端负责导航项 CRUD 操作的服务模块
- **Upload_Service（上传服务）**: 后端负责背景图片上传与存储的服务模块
- **Sidebar（侧边栏）**: 左侧导航菜单组件
- **Homepage（主页）**: 点击"莲花导航"标题后显示的大图卡片导航页面
- **Admin_User（管理员用户）**: user 表中 is_admin 为 true 的用户，可添加公共导航项
- **Regular_User（普通用户）**: 非管理员用户，只能添加私有导航项
- **Verification_Code（验证码）**: 通过邮箱发送的注册验证码，存储在 Redis 中

## 需求

### 需求 1：用户注册

**用户故事：** 作为新用户，我希望通过邮箱和验证码注册账号，以便使用导航网站的个性化功能。

#### 验收标准

1. WHEN 用户请求发送验证码, THE Auth_Service SHALL 向指定邮箱发送6位数字验证码
2. WHEN 验证码发送成功, THE Auth_Service SHALL 将验证码存储到 Redis 中，有效期为5分钟
3. WHEN 同一邮箱在60秒内重复请求验证码, THE Auth_Service SHALL 拒绝请求并返回"请60秒后再试"的提示
4. WHEN 用户提交注册信息（邮箱、密码、验证码）, THE Auth_Service SHALL 验证验证码正确性后创建用户账号
5. IF 验证码不正确或已过期, THEN THE Auth_Service SHALL 返回明确的错误信息并拒绝注册
6. IF 邮箱已被注册, THEN THE Auth_Service SHALL 返回"该邮箱已注册"的错误信息

### 需求 2：用户登录

**用户故事：** 作为已注册用户，我希望通过邮箱和密码登录，以便访问我的个人导航列表。

#### 验收标准

1. WHEN 用户提交正确的邮箱和密码, THE Auth_Service SHALL 返回 JWT token 和用户信息
2. IF 邮箱或密码不正确, THEN THE Auth_Service SHALL 返回"邮箱或密码错误"的提示
3. WHEN 用户携带有效 JWT token 请求接口, THE Auth_Service SHALL 允许访问受保护的资源
4. IF JWT token 无效或已过期, THEN THE Auth_Service SHALL 返回401状态码

### 需求 3：导航项数据管理

**用户故事：** 作为用户，我希望管理我的导航网站列表，以便快速访问常用网站。

#### 验收标准

1. WHEN 已登录用户请求导航列表, THE Navigation_Service SHALL 返回该用户的私有导航项和所有公共导航项
2. WHEN 未登录用户请求导航列表, THE Navigation_Service SHALL 仅返回所有公共导航项
3. WHEN Admin_User 添加导航项并标记为公共, THE Navigation_Service SHALL 创建公共导航项，所有用户可见
4. WHEN Regular_User 添加导航项, THE Navigation_Service SHALL 创建私有导航项，仅该用户可见
5. IF Regular_User 尝试添加公共导航项, THEN THE Navigation_Service SHALL 拒绝请求并返回权限不足的错误
6. THE Navigation_Item SHALL 包含以下属性：网站地址（url）、标题（title）、网站描述（description）、emoji logo、显示模式（iframe 或新标签页跳转）、是否公共项（is_public）、所属用户ID（user_id）、背景图片名称（bg_image）

### 需求 4：背景图片上传

**用户故事：** 作为用户，我希望为导航项上传背景图片，以便在主页展示时具有视觉冲击力。

#### 验收标准

1. WHEN 用户上传背景图片, THE Upload_Service SHALL 生成随机文件名并保存图片到后端 images 文件夹
2. WHEN 图片保存成功, THE Upload_Service SHALL 返回生成的图片文件名
3. IF 上传的文件不是有效的图片格式（jpg、png、gif、webp）, THEN THE Upload_Service SHALL 拒绝上传并返回格式错误提示
4. WHEN 前端请求背景图片, THE Portal SHALL 通过后端静态文件服务访问 images 文件夹中的图片

### 需求 5：主页展示

**用户故事：** 作为用户，我希望在主页看到以大图卡片形式展示的导航项，以便获得良好的视觉体验并快速访问网站。

#### 验收标准

1. WHEN 用户点击侧边栏"莲花导航"标题, THE Portal SHALL 显示主页视图
2. WHEN 主页加载时, THE Portal SHALL 以大图卡片形式展示所有可见的导航项，每张卡片包含背景图、网站标题和网站描述
3. WHEN 用户点击显示模式为"新标签页"的导航项, THE Portal SHALL 在新浏览器标签页中打开该网站地址
4. WHEN 用户点击显示模式为"iframe"的导航项, THE Portal SHALL 在主页区域内以 iframe 方式加载该网站
5. WHEN 主页顶部显示用户信息区域, THE Portal SHALL 提供登录入口，登录后显示用户邮箱和登出按钮

### 需求 6：侧边栏动态导航

**用户故事：** 作为用户，我希望侧边栏能动态显示从后端获取的导航列表，以便实时反映我的导航配置。

#### 验收标准

1. WHEN 用户登录成功, THE Sidebar SHALL 请求后端接口获取该用户的导航列表并显示
2. WHEN 未登录时, THE Sidebar SHALL 显示所有公共导航项
3. WHEN 用户点击侧边栏中显示模式为"新标签页"的导航项, THE Sidebar SHALL 在新浏览器标签页中打开该网站
4. WHEN 用户点击侧边栏中显示模式为"iframe"的导航项, THE Sidebar SHALL 在主页区域内以 iframe 方式加载该网站
5. THE Sidebar SHALL 为每个导航项显示 emoji logo 和网站标题

### 需求 7：添加导航项

**用户故事：** 作为已登录用户，我希望通过表单添加新的导航网站项，以便扩展我的导航列表。

#### 验收标准

1. WHEN 已登录用户打开添加导航项表单, THE Portal SHALL 显示包含以下字段的表单：网站地址、标题、网站描述、是否公共项（仅管理员可见此选项）、显示模式（iframe/新标签页）、emoji logo、背景图片上传
2. WHEN 用户提交有效的导航项表单, THE Navigation_Service SHALL 创建导航项并返回成功响应
3. WHEN 导航项创建成功, THE Portal SHALL 刷新侧边栏和主页的导航列表
4. IF 必填字段（地址、标题）缺失, THEN THE Portal SHALL 阻止提交并显示验证错误提示

### 需求 8：后端架构与配置

**用户故事：** 作为开发者，我希望后端采用清晰的分层架构（route/controller/service/model），以便代码易于维护和扩展。

#### 验收标准

1. THE Portal SHALL 使用 MongoDB 作为数据库，包含用户表（users）和导航项表（nav_items）
2. THE Portal SHALL 将后端配置（MongoDB URL、Redis 用户名密码、邮箱用户名密码）保存在 config.json 文件中
3. THE Portal SHALL 将后端代码组织为 routes、controllers、services、models 四层结构
4. THE Portal SHALL 使用 Redis 存储邮箱验证码，支持设置过期时间
5. THE Portal SHALL 提供静态文件服务，用于访问 images 文件夹中的背景图片
