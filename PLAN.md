# 导航分组功能实现计划

## 目标

侧边栏导航支持分组折叠，管理员可管理分组（增删改排序），可把导航项移入分组。

---

## 一、数据模型

### NavGroup（新建）
```js
{
  _id: ObjectId,
  title: String,       // 分组名称
  order: Number,       // 排序，数字越小越靠前
  created_at: Date
}
```

### NavItem（修改）
在现有字段基础上新增：
```js
{
  ...现有字段,
  nav_group_id: ObjectId | null  // 所属分组，null = 未分组
}
```

---

## 二、后端改动

### 2.1 `backend/models/NavGroup.js`（新建）
```js
const mongoose = require('mongoose');
const navGroupSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});
module.exports = mongoose.model('NavGroup', navGroupSchema);
```

### 2.2 `backend/models/NavItem.js`（修改）
新增 `nav_group_id` 字段：
```js
nav_group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'NavGroup', default: null }
```

### 2.3 `backend/services/navGroupService.js`（新建）
```js
// GET /api/nav-groups — 返回所有分组，含 itemCount
async function getNavGroups() {
  const groups = await NavGroup.find().sort({ order: 1 });
  const items = await NavItem.find({ nav_group_id: { $ne: null } });
  const countMap = {};
  items.forEach(item => {
    const gid = item.nav_group_id.toString();
    countMap[gid] = (countMap[gid] || 0) + 1;
  });
  return groups.map(g => ({
    _id: g._id,
    title: g.title,
    order: g.order,
    itemCount: countMap[g._id.toString()] || 0,
  }));
}

// POST /api/nav-groups — 创建分组
async function createNavGroup(title) {
  const maxOrder = await NavGroup.findOne().sort({ order: -1 });
  const order = maxOrder ? maxOrder.order + 1 : 0;
  return NavGroup.create({ title, order });
}

// PUT /api/nav-groups/:id — 更新分组标题
async function updateNavGroup(id, { title }) {
  return NavGroup.findByIdAndUpdate(id, { title }, { new: true });
}

// DELETE /api/nav-groups/:id — 删除分组（items 的 nav_group_id 置 null）
async function deleteNavGroup(id) {
  await NavItem.updateMany({ nav_group_id: id }, { nav_group_id: null });
  await NavGroup.findByIdAndDelete(id);
  return { message: '删除成功' };
}

// PUT /api/nav-groups/reorder — 批量排序
async function reorderNavGroups(orders) {
  // orders: [{ id, order }]
  const ops = orders.map(({ id, order }) => ({
    updateOne: { filter: { _id: id }, update: { $set: { order } } },
  }));
  await NavGroup.bulkWrite(ops);
  return { message: '排序成功' };
}

// PUT /api/nav-items/:id/group — 更新 item 所属分组
async function setItemGroup(itemId, { nav_group_id }) {
  return NavItem.findByIdAndUpdate(itemId, { nav_group_id: nav_group_id || null }, { new: true });
}
```

### 2.4 `backend/controllers/navGroupController.js`（新建）
```js
const navGroupService = require('../services/navGroupService');

async function getNavGroups(req, res) {
  try {
    const groups = await navGroupService.getNavGroups();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createNavGroup(req, res) {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: '标题不能为空' });
    const group = await navGroupService.createNavGroup(title.trim());
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateNavGroup(req, res) {
  try {
    const { title } = req.body;
    const group = await navGroupService.updateNavGroup(req.params.id, { title });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteNavGroup(req, res) {
  try {
    await navGroupService.deleteNavGroup(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function reorderNavGroups(req, res) {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) return res.status(400).json({ error: '参数错误' });
    await navGroupService.reorderNavGroups(orders);
    res.json({ message: '排序成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function setItemGroup(req, res) {
  try {
    const { nav_group_id } = req.body;
    const item = await navGroupService.setItemGroup(req.params.id, { nav_group_id });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getNavGroups, createNavGroup, updateNavGroup, deleteNavGroup, reorderNavGroups, setItemGroup };
```

### 2.5 `backend/routes/navGroup.js`（新建）
```js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/navGroupController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', controller.getNavGroups);
router.post('/', authMiddleware, controller.createNavGroup);
router.put('/reorder', authMiddleware, controller.reorderNavGroups);
router.put('/:id', authMiddleware, controller.updateNavGroup);
router.delete('/:id', authMiddleware, controller.deleteNavGroup);

module.exports = router;
```

### 2.6 `backend/app.js`（修改）
注册 navGroup 路由：
```js
app.use('/api/nav-groups', require('./routes/navGroup'));
```

在 navItem group 更新路由（在 navItem.js 的 put 路由之后）：
```js
router.put('/:id/group', authMiddleware, controller.setItemGroup);
```

### 2.7 `backend/services/navItemService.js`（修改）
`getNavItems` 返回数据中附加分组信息（populate）：
```js
async function getNavItems(userId) {
  if (userId) {
    const userGroupIds = await UserGroup.find({ user_id: userId }).distinct('group_id');
    const conditions = [
      { is_public: true },
      { user_id: userId },
    ];
    if (userGroupIds.length > 0) {
      conditions.push({ visible_group_ids: { $in: userGroupIds } });
    }
    // 包含 nav_group_id 字段（已有默认 null）
    return NavItem.find({ $or: conditions }).sort({ nav_group_id: 1, sort_order: 1, created_at: -1 });
  }
  return NavItem.find({ is_public: true }).sort({ nav_group_id: 1, sort_order: 1, created_at: -1 });
}
```

`updateNavItem` 允许更新 `nav_group_id`：
```js
const allowed = [...原有..., 'nav_group_id'];
```

---

## 三、前端改动

### 3.1 `src/api.js`（修改）
```js
// 新增 API
export const navGroupApi = {
  getGroups: () => request('/api/nav-groups'),
  createGroup: (title) => request('/api/nav-groups', { method: 'POST', body: { title } }),
  updateGroup: (id, title) => request(`/api/nav-groups/${id}`, { method: 'PUT', body: { title } }),
  deleteGroup: (id) => request(`/api/nav-groups/${id}`, { method: 'DELETE' }),
  reorderGroups: (orders) => request('/api/nav-groups/reorder', { method: 'PUT', body: { orders } }),
  setItemGroup: (itemId, nav_group_id) => request(`/api/nav-items/${itemId}/group`, { method: 'PUT', body: { nav_group_id } }),
};
```

### 3.2 `src/hooks/usePortal.js`（修改）
新增 state 和 handler：
```js
const [groups, setGroups] = useState([]);       // NavGroup[]
const [collapsedGroups, setCollapsedGroups] = useState({}); // { [groupId]: boolean }
```

```js
// 获取分组列表
const fetchGroups = useCallback(async () => {
  try {
    const data = await navGroupApi.getGroups();
    setGroups(data);
  } catch (err) { console.error('获取分组失败', err); }
}, []);

// 新增
const toggleGroup = useCallback((groupId) => {
  setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
}, []);

const expandAll = useCallback(() => {
  const all = {};
  groups.forEach(g => { all[g._id] = false; }); // 全部展开
  setCollapsedGroups(all);
}, [groups]);

const collapseAll = useCallback(() => {
  const all = {};
  groups.forEach(g => { all[g._id] = true; }); // 全部折叠
  setCollapsedGroups(all);
}, [groups]);
```

init useEffect 中调用 `fetchGroups()`。

返回值新增：`groups, fetchGroups, toggleGroup, expandAll, collapseAll`

### 3.3 `src/components/Sidebar.jsx`（修改）

Sidebar props 新增：`groups, collapsedGroups, onToggleGroup, onExpandAll, onCollapseAll, onOpenGroupManage`

nav 区域改为分组渲染：
```jsx
<nav className={styles.nav}>
  {/* 分组列表 */}
  {groups.map(group => {
    const groupItems = navItems.filter(it => it.nav_group_id === group._id);
    const isCollapsed = collapsedGroups[group._id];
    return (
      <div key={group._id} className={styles.groupSection}>
        <div className={styles.groupHeader} onClick={() => onToggleGroup(group._id)}>
          <span className={`${styles.chevron} ${isCollapsed ? styles.chevronCollapsed : ''}`}>›</span>
          <span className={styles.groupTitle}>{group.title}</span>
          <span className={styles.groupCount}>{groupItems.length}</span>
        </div>
        {!isCollapsed && (
          <ul className={styles.groupItems}>
            {groupItems.map(item => (
              <li key={item._id}>
                <a className={`${styles.link} ${selectedId === item._id ? styles.active : ''}`}
                   onClick={e => handleItemClick(e, item)}>
                  <span className={styles.linkIcon}>
                    {item.icon ? <img src={`/images/${item.icon}`} .../> : <IconLink size={20} />}
                  </span>
                  <span>{item.title}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  })}
  {/* 未分组 */}
  {navItems.filter(it => !it.nav_group_id).length > 0 && (
    <div className={styles.ungroupedSection}>
      {groups.length > 0 && <div className={styles.ungroupedTitle}>未分组</div>}
      {navItems.filter(it => !it.nav_group_id).map(item => (
        <a key={item._id} className={`${styles.link} ${selectedId === item._id ? styles.active : ''}`}
           onClick={e => handleItemClick(e, item)}>
          <span className={styles.linkIcon}>...</span>
          <span>{item.title}</span>
        </a>
      ))}
    </div>
  )}
</nav>
```

Sidebar header 区（在 currentBox 下方或 footer 区）新增展开/折叠按钮（当 groups.length > 0 时显示）：
```jsx
{groups.length > 0 && (
  <div className={styles.groupActions}>
    <button onClick={onExpandAll} title="全部展开">⊟</button>
    <button onClick={onCollapseAll} title="全部折叠">⊠</button>
  </div>
)}
```

### 3.4 `src/css/components/Sidebar.module.css`（修改）
新增样式：
```css
.groupSection { margin-bottom: 4px; }
.groupHeader {
  display: flex; align-items: center;
  padding: 8px 14px; border-radius: 8px;
  cursor: pointer; color: var(--text-secondary);
  font-size: 14px; font-weight: 600;
  transition: background 0.15s ease;
}
.groupHeader:hover { background: var(--surface-hover); color: var(--text-primary); }
.chevron { margin-right: 6px; font-size: 16px; transition: transform 0.2s ease; display: inline-block; width: 12px; }
.chevronCollapsed { transform: rotate(0deg); }
.chevron:not(.chevronCollapsed) { transform: rotate(90deg); }
.groupTitle { flex: 1; }
.groupCount { font-size: 11px; color: var(--text-muted); font-weight: 400; margin-left: 6px; }
.groupItems { margin: 0; padding: 0 0 4px 0; list-style: none; }
.ungroupedSection { margin-top: 8px; }
.ungroupedTitle { font-size: 11px; color: var(--text-muted); padding: 4px 14px; text-transform: uppercase; letter-spacing: 0.08em; }
.groupActions {
  display: flex; gap: 4px; padding: 4px 12px 8px;
}
.groupActions button {
  background: none; border: none; color: var(--text-muted);
  cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 4px;
}
.groupActions button:hover { background: var(--surface-hover); color: var(--text-primary); }
```

### 3.5 `src/components/GroupManageModal.jsx`（新建）
全屏弹窗组件，管理分组。

功能：
- 左侧：分组列表（可编辑标题、可删除、可拖拽排序）
- 右侧：所有导航项列表（可拖入分组）
- 底部：新增分组按钮

关键交互：
- 双击分组标题 → 进入编辑态（input）
- 点击分组右侧 × → 删除分组（items 自动变为未分组）
- 拖拽分组行 → 排序
- 拖拽导航项到分组行 → 更新 item 的 nav_group_id

### 3.6 `src/css/components/GroupManageModal.module.css`（新建）
弹窗样式：宽度 600px，背景 `var(--menu-bg)`，backdrop-filter blur。

### 3.7 `src/components/Icons.jsx`（修改）
新增图标：
```js
export const IconChevronRight = ...
export const IconFolder = ...
export const IconGripVertical = ...
export const IconPlus = ...
export const IconTrash = ...
```

### 3.8 `src/pages/Homepage.jsx`（修改）
头像 dropdown 菜单新增「管理分组」按钮：
```jsx
<button className={styles.menuItem} onClick={() => { setMenuOpen(false); onOpenGroupManage?.(); }}>
  管理分组
</button>
```

### 3.9 `src/pages/Portal.jsx`（修改）
- `onOpenGroupManage` state 和 handler
- `showGroupManage` modal state
- `<GroupManageModal visible={showGroupManage} ... />`

### 3.10 `src/mobile/MobileHomepage.jsx`（修改）
头像菜单同样新增「管理分组」入口。

---

## 四、实现顺序

1. 后端：NavGroup 模型
2. 后端：NavGroup service + controller + route
3. 后端：NavItem 模型加字段 + 更新 navItemService + navItemController（setItemGroup）
4. 前端：api.js 加 navGroupApi
5. 前端：Icons.jsx 加新图标
6. 前端：usePortal.js 加 groups 状态和 handler
7. 前端：Sidebar 分组渲染 + CSS
8. 前端：GroupManageModal 组件 + CSS
9. 前端：Homepage 头像菜单加入口 + Portal 接入 modal
10. 前端：MobileHomepage 头像菜单加入口

---

## 五、验证步骤

1. `npm run build` 编译通过
2. 后端 `curl http://localhost:3001/api/nav-groups` 返回分组列表
3. 创建分组 → 分组出现在侧边栏
4. 拖导航项进分组 → 侧边栏更新
5. 点击分组 header → 折叠/展开动画正常
6. 展开/折叠全部按钮 → 全部同步更新
7. Playwright 检查无 console error（API 错误除外）
