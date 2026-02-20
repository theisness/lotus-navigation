import { useEffect, useRef, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import ToggleSidebar from '../components/ToggleSidebar.jsx';
import Loader from '../components/Loader.jsx';
import IframeView from '../components/IframeView.jsx';
import Homepage from './Homepage.jsx';
import AuthForm from '../components/AuthForm.jsx';
import AddNavForm from '../components/AddNavForm.jsx';
import ProfileForm from '../components/ProfileForm.jsx';
import MemberManage from '../components/MemberManage.jsx';
import GroupManage from '../components/GroupManage.jsx';
import NavSortModal from '../components/NavSortModal.jsx';
import { authApi, navApi, settingsApi, getToken, removeToken } from '../api.js';
import styles from '../css/pages/Portal.module.css';

export default function Portal() {
  // 视图状态: 'homepage' | 'iframe'
  const [view, setView] = useState('homepage');
  const [selectedItem, setSelectedItem] = useState(null);

  // 用户状态
  const [user, setUser] = useState(null);

  // 导航列表
  const [navItems, setNavItems] = useState([]);

  // UI 状态
  const [collapsed, setCollapsed] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [colorTheme, setColorTheme] = useState('purple');

  // 模态框状态
  const [showAuth, setShowAuth] = useState(false);
  const [showAddNav, setShowAddNav] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMemberManage, setShowMemberManage] = useState(false);
  const [showGroupManage, setShowGroupManage] = useState(false);
  const [showNavSort, setShowNavSort] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const mainRef = useRef(null);

  // 主题切换
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 颜色主题
  useEffect(() => {
    document.documentElement.setAttribute('data-color-theme', colorTheme);
  }, [colorTheme]);

  const handleToggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  // 管理员设置颜色主题
  const handleColorThemeChange = useCallback(async (key) => {
    setColorTheme(key);
    try {
      await settingsApi.setTheme(key);
    } catch (err) {
      console.error('保存主题失败:', err);
    }
  }, []);

  // 获取导航列表
  const fetchNavItems = useCallback(async () => {
    try {
      const data = await navApi.getNavItems();
      setNavItems(data.navItems || data);
    } catch (err) {
      console.error('获取导航列表失败:', err);
    }
  }, []);

  // 初始化：检查登录状态 + 获取导航列表 + 获取站点主题
  useEffect(() => {
    const init = async () => {
      // 获取站点颜色主题
      try {
        const themeData = await settingsApi.getTheme();
        if (themeData.theme) setColorTheme(themeData.theme);
      } catch {}

      const token = getToken();
      if (token) {
        try {
          const data = await authApi.getMe();
          setUser(data.user || data);
        } catch {
          removeToken();
        }
      }
      fetchNavItems();
    };
    init();
  }, [fetchNavItems]);

  // 登录成功
  const handleLoginSuccess = useCallback((userData) => {
    setUser(userData);
    fetchNavItems();
  }, [fetchNavItems]);

  // 登出
  const handleLogout = useCallback(() => {
    removeToken();
    setUser(null);
    setView('homepage');
    setSelectedItem(null);
    fetchNavItems();
  }, [fetchNavItems]);

  // 侧边栏选择导航项（iframe 模式）
  const handleSelectItem = useCallback((item) => {
    setLoaderVisible(true);
    setSelectedItem(item);
    setView('iframe');
    setTimeout(() => setLoaderVisible(false), 400);
  }, []);

  // 主页卡片点击 iframe 打开
  const handleIframeOpen = useCallback((item) => {
    setLoaderVisible(true);
    setSelectedItem(item);
    setView('iframe');
    setTimeout(() => setLoaderVisible(false), 400);
  }, []);

  // 回到主页
  const handleGoHome = useCallback(() => {
    setView('homepage');
    setSelectedItem(null);
  }, []);

  // 刷新 iframe
  const handleRefresh = useCallback(() => {
    setLoaderVisible(true);
    setReloadKey(k => k + 1);
  }, []);

  // 添加导航项成功
  const handleAddNavSuccess = useCallback(() => {
    fetchNavItems();
  }, [fetchNavItems]);

  // 编辑导航项
  const handleEdit = useCallback((item) => {
    setEditItem(item);
    setShowAddNav(true);
  }, []);

  // 删除导航项
  const handleDelete = useCallback(async (id) => {
    try {
      await navApi.deleteNavItem(id);
      fetchNavItems();
    } catch (err) {
      console.error('删除失败:', err);
    }
  }, [fetchNavItems]);

  // 侧边栏折叠
  const handleToggleSidebar = useCallback(() => setCollapsed(v => !v), []);

  // 全屏
  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && mainRef.current) {
        await mainRef.current.requestFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('全屏切换错误:', err);
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  return (
    <div className={styles.app}>
      {!collapsed && (
        <aside className={styles.sidebar}>
          <Sidebar
            navItems={navItems}
            selectedId={selectedItem?._id}
            currentTitle={view === 'iframe' ? selectedItem?.title : ''}
            currentUrl={view === 'iframe' ? selectedItem?.url : ''}
            onSelect={handleSelectItem}
            onRefresh={handleRefresh}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onCollapse={handleToggleSidebar}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onGoHome={handleGoHome}
            isAdmin={user?.is_admin || false}
            colorTheme={colorTheme}
            onColorThemeChange={handleColorThemeChange}
          />
        </aside>
      )}

      <main className={styles.main} ref={mainRef}>
        {!isFullscreen && <ToggleSidebar collapsed={collapsed} onToggle={handleToggleSidebar} />}

        <div className={styles.content}>
          <Loader visible={loaderVisible} />

          {view === 'homepage' && (
            <Homepage
              navItems={navItems}
              user={user}
              onLogin={() => setShowAuth(true)}
              onLogout={handleLogout}
              onAddNav={() => { setEditItem(null); setShowAddNav(true); }}
              onIframeOpen={handleIframeOpen}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onOpenProfile={() => setShowProfile(true)}
              onOpenMemberManage={() => setShowMemberManage(true)}
              onOpenGroupManage={() => setShowGroupManage(true)}
              onOpenNavSort={() => setShowNavSort(true)}
            />
          )}

          {view === 'iframe' && selectedItem && (
            <IframeView
              visible
              url={selectedItem.url}
              reloadKey={reloadKey}
              onLoad={() => setLoaderVisible(false)}
            />
          )}
        </div>
      </main>

      <AuthForm
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <AddNavForm
        visible={showAddNav}
        onClose={() => { setShowAddNav(false); setEditItem(null); }}
        onSuccess={handleAddNavSuccess}
        isAdmin={user?.is_admin || false}
        editItem={editItem}
      />

      <ProfileForm
        visible={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
        onSuccess={(updatedUser) => setUser(updatedUser)}
      />

      <MemberManage
        visible={showMemberManage}
        onClose={() => setShowMemberManage(false)}
        currentUser={user}
      />

      <GroupManage
        visible={showGroupManage}
        onClose={() => setShowGroupManage(false)}
      />

      <NavSortModal
        visible={showNavSort}
        onClose={() => setShowNavSort(false)}
        navItems={navItems}
        onSuccess={fetchNavItems}
      />
    </div>
  );
}
