import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { authApi, navApi, settingsApi, navGroupApi, getToken, removeToken } from '../api.js';
import { rewriteSsoUrl } from '../utils/ssoRewrite.js';

export function urlToSlug(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function usePortal({ onLogout: onLogoutCallback } = {}) {
  const { navId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // ===== 共享状态 =====
  const [user, setUser] = useState(null);
  const [navItems, setNavItems] = useState([]);
  const [openedItems, setOpenedItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loaderVisible, setLoaderVisible] = useState(false);
  // 默认深色（不再按小时自动切换）；本地手动切换过的持久化在 localStorage，优先生效
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  // colorTheme 个人本地覆盖优先于服务端全站设置：localStorage 有值用它，
  // 否则用 'lotus' 作为初始值，稍后被 settingsApi.getTheme() 的站内全局值覆盖（见下方 init）
  const [colorTheme, setColorTheme] = useState(() => localStorage.getItem('colorTheme') || 'lotus');

  // 模态框状态
  const [showAuth, setShowAuth] = useState(false);
  const [showAddNav, setShowAddNav] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMemberManage, setShowMemberManage] = useState(false);
  const [showGroupManage, setShowGroupManage] = useState(false);      // 菜单栏分组（NavGroup）
  const [showPermGroupManage, setShowPermGroupManage] = useState(false); // 权限分组（成员可见性）
  const [showNavSort, setShowNavSort] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // 分组状态
  const [groups, setGroups] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // ===== 派生状态 =====
  const isDownload = location.pathname === '/download';
  const isHomepage = !navId && !isDownload;
  const selectedItem = navItems.find(it => it._id === activeId) || null;

  // ===== 主题 =====
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
    localStorage.setItem('colorTheme', key); // 个人本地覆盖，此后优先于站内全局设置
    try { await settingsApi.setTheme(key); } catch {} // 管理员点选时仍会尝试写全站设置，非管理员会被后端拒绝但已 catch
  }, []);

  // ===== 数据获取 =====
  const fetchNavItems = useCallback(async () => {
    try {
      const data = await navApi.getNavItems();
      setNavItems(data.navItems || data);
    } catch (err) {
      console.error('获取导航列表失败:', err);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const data = await navGroupApi.getGroups();
      setGroups(data);
    } catch (err) {
      console.error('获取分组失败:', err);
    }
  }, []);

  const toggleGroup = useCallback((groupId) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const expandAll = useCallback(() => {
    const all = {};
    groups.forEach(g => { all[g._id] = false; });
    setCollapsedGroups(all);
  }, [groups]);

  const collapseAll = useCallback(() => {
    const all = {};
    groups.forEach(g => { all[g._id] = true; });
    setCollapsedGroups(all);
  }, [groups]);

  // ===== 初始化 =====
  useEffect(() => {
    const init = async () => {
      // 个人本地覆盖优先：只有没有本地选择时才用服务端全站设置
      if (!localStorage.getItem('colorTheme')) {
        try {
          const themeData = await settingsApi.getTheme();
          if (themeData.theme) setColorTheme(themeData.theme);
        } catch {}
      }

      const token = getToken();
      if (token) {
        try {
          const data = await authApi.getMe();
          setUser(data.user || data);
        } catch { removeToken(); }
      }
      fetchNavItems();
      fetchGroups();
    };
    init();
  }, [fetchNavItems]);

  // ===== URL 同步 =====
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

  // ===== Handlers =====
  const handleSelectItem = useCallback((item) => {
    if (item.display_mode === 'redirect') {
      window.open(rewriteSsoUrl(item.url), '_blank', 'noopener,noreferrer');
      return;
    }
    setOpenedItems(prev => {
      if (prev.some(it => it._id === item._id)) return prev;
      return [...prev, item];
    });
    setActiveId(item._id);
    navigate(`/nav/${urlToSlug(item.url)}`);
  }, [navigate]);

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
    onLogoutCallback?.(); // 通知 App 级路由：退回品牌登录门（GuestPortal）
  }, [fetchNavItems, navigate, onLogoutCallback]);

  const handleRefresh = useCallback(() => {
    if (!activeId) return;
    setOpenedItems(prev => {
      const item = prev.find(it => it._id === activeId);
      if (!item) return prev;
      const filtered = prev.filter(it => it._id !== activeId);
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

  // ===== 返回所有共享状态和 handlers =====
  return {
    // 状态
    user,
    navItems,
    openedItems,
    activeId,
    loaderVisible,
    theme,
    colorTheme,
    showAuth,
    showAddNav,
    showProfile,
    showMemberManage,
    showGroupManage,
    showPermGroupManage,
    showNavSort,
    editItem,
    // 分组
    groups,
    collapsedGroups,
    fetchGroups,
    toggleGroup,
    expandAll,
    collapseAll,
    // 派生
    isDownload,
    isHomepage,
    selectedItem,
    // Setters
    setUser,
    setLoaderVisible,
    setEditItem,
    // 模态框 setters
    setShowAuth,
    setShowAddNav,
    setShowProfile,
    setShowMemberManage,
    setShowGroupManage,
    setShowPermGroupManage,
    setShowNavSort,
    // handlers
    fetchNavItems,
    handleToggleTheme,
    handleColorThemeChange,
    handleSelectItem,
    handleGoHome,
    handleLoginSuccess,
    handleLogout,
    handleRefresh,
    handleAddNavSuccess,
    handleEdit,
    handleDelete,
  };
}
