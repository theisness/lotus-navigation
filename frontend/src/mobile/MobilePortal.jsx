import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import MobileHomepage from './MobileHomepage.jsx';
import MobileBottomBar from './MobileBottomBar.jsx';
import Loader from '../components/Loader.jsx';
import IframeView from '../components/IframeView.jsx';
import AuthForm from '../components/AuthForm.jsx';
import AddNavForm from '../components/AddNavForm.jsx';
import ProfileForm from '../components/ProfileForm.jsx';
import MemberManage from '../components/MemberManage.jsx';
import GroupManage from '../components/GroupManage.jsx';
import NavSortModal from '../components/NavSortModal.jsx';
import DownloadPage from '../components/DownloadPage.jsx';
import { authApi, navApi, settingsApi, getToken, removeToken } from '../api.js';
import styles from './css/MobilePortal.module.css';

function urlToSlug(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function MobilePortal() {
  const { navId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [navItems, setNavItems] = useState([]);
  const [openedItems, setOpenedItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    const h = new Date().getHours();
    return (h >= 7 && h < 21) ? 'light' : 'dark';
  });
  const [colorTheme, setColorTheme] = useState('purple');

  const [showAuth, setShowAuth] = useState(false);
  const [showAddNav, setShowAddNav] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMemberManage, setShowMemberManage] = useState(false);
  const [showGroupManage, setShowGroupManage] = useState(false);
  const [showNavSort, setShowNavSort] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const isDownload = location.pathname === '/download';
  const isHomepage = !navId && !isDownload;

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

  const fetchNavItems = useCallback(async () => {
    try {
      const data = await navApi.getNavItems();
      setNavItems(data.navItems || data);
    } catch (err) {
      console.error('获取导航列表失败:', err);
    }
  }, []);

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

  const handleAddNavSuccess = useCallback(() => { fetchNavItems(); }, [fetchNavItems]);

  const handleEdit = useCallback((item) => {
    setEditItem(item);
    setShowAddNav(true);
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      await navApi.deleteNavItem(id);
      setOpenedItems(prev => prev.filter(it => it._id !== id));
      if (activeId === id) { setActiveId(null); navigate('/'); }
      fetchNavItems();
    } catch (err) {
      console.error('删除失败:', err);
    }
  }, [fetchNavItems, activeId, navigate]);

  return (
    <div className={styles.app}>
      <div className={styles.content}>
        <Loader visible={loaderVisible} />

        {isDownload && (
          <DownloadPage onEnterWeb={() => navigate('/')} />
        )}

        {isHomepage && (
          <MobileHomepage
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
            theme={theme}
            onToggleTheme={handleToggleTheme}
            colorTheme={colorTheme}
            onColorThemeChange={handleColorThemeChange}
            isAdmin={user?.is_admin || false}
            onOpenDownload={() => navigate('/download')}
          />
        )}

        {openedItems.length > 0 && !isDownload && (
          <IframeView
            openedItems={openedItems}
            activeId={isHomepage ? null : activeId}
            onLoad={() => setLoaderVisible(false)}
          />
        )}
      </div>

      <MobileBottomBar
        navItems={navItems}
        activeId={activeId}
        onGoHome={handleGoHome}
        onSelect={handleSelectItem}
        isHomepage={isHomepage}
      />

      <AuthForm visible={showAuth} onClose={() => setShowAuth(false)} onLoginSuccess={handleLoginSuccess} />
      <AddNavForm visible={showAddNav} onClose={() => { setShowAddNav(false); setEditItem(null); }} onSuccess={handleAddNavSuccess} isAdmin={user?.is_admin || false} editItem={editItem} />
      <ProfileForm visible={showProfile} onClose={() => setShowProfile(false)} user={user} onSuccess={(u) => setUser(u)} />
      <MemberManage visible={showMemberManage} onClose={() => setShowMemberManage(false)} currentUser={user} />
      <GroupManage visible={showGroupManage} onClose={() => setShowGroupManage(false)} />
      <NavSortModal visible={showNavSort} onClose={() => setShowNavSort(false)} navItems={navItems} onSuccess={fetchNavItems} />
    </div>
  );
}
