import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

// 从 URL 提取 slug：直接用完整 hostname
function urlToSlug(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function Portal() {
  const { navId } = useParams();
  const navigate = useNavigate();

  // 用户状态
  const [user, setUser] = useState(null);

  // 导航列表
  const [navItems, setNavItems] = useState([]);

  // iframe 缓存：已打开过的导航项列表
  const [openedItems, setOpenedItems] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // UI 状态
  const [collapsed, setCollapsed] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [colorTheme, setColorTheme] = useState('purple');
  const [layoutMode, setLayoutMode] = useState(() => localStorage.getItem('layoutMode') || 'list');

  // 模态框状态
  const [showAuth, setShowAuth] = useState(false);
  const [showAddNav, setShowAddNav] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMemberManage, setShowMemberManage] = useState(false);
  const [showGroupManage, setShowGroupManage] = useState(false);
  const [showNavSort, setShowNavSort] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const mainRef = useRef(null);

  // 判断当前视图
  const isHomepage = !navId;
  const selectedItem = navItems.find(it => it._id === activeId) || null;

  // 主题切换
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-color-theme', colorTheme);
  }, [colorTheme]);

  const handleToggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  const handleColorThemeChange = useCallback(async (key) => {
    setColorTheme(key);
    try { await settingsApi.setTheme(key); } catch {}
  }, []);

  // 布局切换
  const handleToggleLayout = useCallback(() => {
    setLayoutMode(m => {
      const next = m === 'list' ? 'grid' : 'list';
      localStorage.setItem('layoutMode', next);
      return next;
    });
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

  // 初始化
  useEffect(() => {
    const init = async () => {
      try {
        const themeData = await settingsApi.getTheme();
        if (themeData.theme) setColorTheme(themeData.theme);
      } catch {}

      const token = getToken();
      if (token) {
        try {
          const data = await authApi.getMe();
          setUser(data.user || data);
        } catch { removeToken(); }
      }
      fetchNavItems();
    };
    init();
  }, [fetchNavItems]);

  // URL 参数变化时同步 activeId 和 openedItems
  useEffect(() => {
    if (navId && navItems.length > 0) {
      const item = navItems.find(it => urlToSlug(it.url) === navId);
      if (item) {
        setActiveId(item._id);
        setOpenedItems(prev => {
          if (prev.some(it => it._id === item._id)) return prev;
          return [...prev, item];
        });
      }
    } else if (!navId) {
      setActiveId(null);
    }
  }, [navId, navItems]);

  // 选择导航项（iframe 模式）
  const handleSelectItem = useCallback((item) => {
    if (item.display_mode === 'redirect') {
      window.open(item.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setOpenedItems(prev => {
      if (prev.some(it => it._id === item._id)) return prev;
      return [...prev, item];
    });
    setActiveId(item._id);
    navigate(`/nav/${urlToSlug(item.url)}`);
  }, [navigate]);

  // 回到主页
  const handleGoHome = useCallback(() => {
    setActiveId(null);
    navigate('/');
  }, [navigate]);

  const handleLoginSuccess = useCallback((userData) => {
    setUser(userData);
    fetchNavItems();
  }, [fetchNavItems]);

  const handleLogout = useCallback(() => {
    removeToken();
    setUser(null);
    setActiveId(null);
    setOpenedItems([]);
    navigate('/');
    fetchNavItems();
  }, [fetchNavItems, navigate]);

  const handleRefresh = useCallback(() => {
    if (!activeId) return;
    // 移除再重新添加来强制刷新
    setOpenedItems(prev => {
      const item = prev.find(it => it._id === activeId);
      if (!item) return prev;
      const filtered = prev.filter(it => it._id !== activeId);
      // 用 setTimeout 重新添加
      setTimeout(() => {
        setOpenedItems(p => [...p, item]);
      }, 50);
      return filtered;
    });
  }, [activeId]);

  const handleAddNavSuccess = useCallback(() => { fetchNavItems(); }, [fetchNavItems]);

  const handleEdit = useCallback((item) => {
    setEditItem(item);
    setShowAddNav(true);
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      await navApi.deleteNavItem(id);
      setOpenedItems(prev => prev.filter(it => it._id !== id));
      if (activeId === id) {
        setActiveId(null);
        navigate('/');
      }
      fetchNavItems();
    } catch (err) {
      console.error('删除失败:', err);
    }
  }, [fetchNavItems, activeId, navigate]);

  const handleToggleSidebar = useCallback(() => setCollapsed(v => !v), []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && mainRef.current) {
        await mainRef.current.requestFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {}
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
            selectedId={activeId}
            currentTitle={!isHomepage ? selectedItem?.title : ''}
            currentUrl={!isHomepage ? selectedItem?.url : ''}
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
            layoutMode={layoutMode}
            onToggleLayout={handleToggleLayout}
          />
        </aside>
      )}

      <main className={styles.main} ref={mainRef}>
        {!isFullscreen && <ToggleSidebar collapsed={collapsed} onToggle={handleToggleSidebar} />}

        <div className={styles.content}>
          <Loader visible={loaderVisible} />

          {isHomepage && (
            <Homepage
              navItems={navItems}
              user={user}
              onLogin={() => setShowAuth(true)}
              onLogout={handleLogout}
              onAddNav={() => { setEditItem(null); setShowAddNav(true); }}
              onIframeOpen={handleSelectItem}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onOpenProfile={() => setShowProfile(true)}
              onOpenMemberManage={() => setShowMemberManage(true)}
              onOpenGroupManage={() => setShowGroupManage(true)}
              onOpenNavSort={() => setShowNavSort(true)}
              layoutMode={layoutMode}
            />
          )}

          {openedItems.length > 0 && (
            <IframeView
              openedItems={openedItems}
              activeId={isHomepage ? null : activeId}
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
