import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import GroupManageModal from '../components/GroupManageModal.jsx';
import NavSortModal from '../components/NavSortModal.jsx';
import DownloadPage from '../components/DownloadPage.jsx';
import { usePortal } from '../hooks/usePortal.js';
import styles from '../css/pages/Portal.module.css';

export default function Portal() {
  const navigate = useNavigate();
  const mainRef = useRef(null);

  // ===== 桌面端独有状态 =====
  const [collapsed, setCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layoutMode, setLayoutMode] = useState(() => {
    const saved = localStorage.getItem('layoutMode');
    const num = Number(saved);
    return isNaN(num) || num < 1 || num > 5 ? 2 : num;
  });

  // ===== 使用共享 hook =====
  const {
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
    isDownload,
    isHomepage,
    selectedItem,
    setUser,
    setShowAuth,
    setShowAddNav,
    setShowProfile,
    setShowMemberManage,
    setShowGroupManage,
    setShowPermGroupManage,
    setShowNavSort,
    // 分组
    groups,
    collapsedGroups,
    toggleGroup,
    expandAll,
    collapseAll,
    fetchNavItems,
    fetchGroups,
    setEditItem,
    handleToggleTheme,
    handleColorThemeChange,
    handleSelectItem,
    handleRefresh,
    handleGoHome,
    handleLoginSuccess,
    handleLogout,
    handleAddNavSuccess,
    handleEdit,
    handleDelete,
  } = usePortal();

  // ===== 桌面端独有 handlers =====
  const handleToggleLayout = useCallback((n) => {
    setLayoutMode(n);
    localStorage.setItem('layoutMode', String(n));
  }, []);

  const handleToggleSidebar = useCallback(() => setCollapsed(v => !v), []);

  // 菜单栏分组增删改 / 移动导航项后，刷新导航项与分组，使侧边栏即时更新
  const handleGroupChange = useCallback(() => {
    fetchNavItems();
    fetchGroups();
  }, [fetchNavItems, fetchGroups]);

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
            onOpenDownload={() => navigate('/download')}
            groups={groups}
            collapsedGroups={collapsedGroups}
            onToggleGroup={toggleGroup}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
          />
        </aside>
      )}

      <main className={styles.main} ref={mainRef}>
        {!isFullscreen && <ToggleSidebar collapsed={collapsed} onToggle={handleToggleSidebar} />}

        <div className={styles.content}>
          <Loader visible={loaderVisible} />

          {isDownload && (
            <DownloadPage onEnterWeb={() => navigate('/')} />
          )}

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
              onOpenPermGroupManage={() => setShowPermGroupManage(true)}
              onOpenNavSort={() => setShowNavSort(true)}
              layoutMode={layoutMode}
            />
          )}

          {openedItems.length > 0 && !isDownload && (
            <IframeView
              openedItems={openedItems}
              activeId={isHomepage ? null : activeId}
              onLoad={() => {}}
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
        visible={showPermGroupManage}
        onClose={() => setShowPermGroupManage(false)}
      />
      <GroupManageModal
        visible={showGroupManage}
        onClose={() => setShowGroupManage(false)}
        navItems={navItems}
        onSuccess={handleGroupChange}
      />
      <NavSortModal
        visible={showNavSort}
        onClose={() => setShowNavSort(false)}
        navItems={navItems}
        onSuccess={handleAddNavSuccess}
      />
    </div>
  );
}
