import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileHomepage from './MobileHomepage.jsx';
import MobileBottomBar from './MobileBottomBar.jsx';
import MobileProfileSheet from './MobileProfileSheet.jsx';
import Loader from '../components/Loader.jsx';
import IframeView from '../components/IframeView.jsx';
import AuthForm from '../components/AuthForm.jsx';
import AddNavForm from '../components/AddNavForm.jsx';
import ProfileForm from '../components/ProfileForm.jsx';
import MemberManage from '../components/MemberManage.jsx';
import GroupManage from '../components/GroupManage.jsx';
import GroupManageModal from '../components/GroupManageModal.jsx';
import NavSortModal from '../components/NavSortModal.jsx';
import DownloadPage from '../components/DownloadPage.jsx';
import { usePortal } from '../hooks/usePortal.js';
import styles from './css/MobilePortal.module.css';

export default function MobilePortal({ onLoggedOut }) {
  const navigate = useNavigate();

  // ===== 使用共享 hook =====
  const {
    user,
    navItems,
    groups,
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
    setUser,
    setShowAuth,
    setShowAddNav,
    setShowProfile,
    setShowMemberManage,
    setShowGroupManage,
    setShowPermGroupManage,
    setShowNavSort,
    fetchNavItems,
    fetchGroups,
    setEditItem,
    handleToggleTheme,
    handleColorThemeChange,
    handleSelectItem,
    handleGoHome,
    handleLoginSuccess,
    handleLogout,
    handleAddNavSuccess,
    handleEdit,
    handleDelete,
  } = usePortal({ onLogout: onLoggedOut });

  const handleGroupChange = () => { fetchNavItems(); fetchGroups(); };

  // ===== 底栏三 tab 需要的本地状态 =====
  const [sheetOpen, setSheetOpen] = useState(false);
  // 首页单/双列开关原先在 MobileHomepage 内部，随设置一并移到「我的」弹层，故提到这里
  const [colMode, setColMode] = useState(() =>
    Number(localStorage.getItem('mobileColMode')) === 2 ? 2 : 1
  );
  const toggleColMode = () => {
    const next = colMode === 1 ? 2 : 1;
    setColMode(next);
    localStorage.setItem('mobileColMode', String(next));
  };

  // 第二个 tab = 当前正在看的导航项；回主页后仍保留最近一项，方便一键切回去
  const [lastItem, setLastItem] = useState(null);
  useEffect(() => {
    if (!activeId) return;
    const it = navItems.find((i) => i._id === activeId);
    if (it) setLastItem(it);
  }, [activeId, navItems]);
  const currentItem = (activeId && navItems.find((i) => i._id === activeId)) || lastItem;

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
            groups={groups}
            user={user}
            onLogin={() => setShowAuth(true)}
            onLogout={handleLogout}
            onAddNav={() => { setEditItem(null); setShowAddNav(true); }}
            onIframeOpen={handleSelectItem}
            onEdit={handleEdit}
            onDelete={handleDelete}
            colMode={colMode}
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

      <MobileBottomBar
        currentItem={currentItem}
        activeId={activeId}
        onGoHome={() => { setSheetOpen(false); handleGoHome(); }}
        onSelect={(item) => { setSheetOpen(false); handleSelectItem(item); }}
        isHomepage={isHomepage}
        user={user}
        sheetOpen={sheetOpen}
        onOpenSheet={() => setSheetOpen((v) => !v)}
      />

      <MobileProfileSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        user={user}
        isAdmin={user?.is_admin || false}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        colorTheme={colorTheme}
        onColorThemeChange={handleColorThemeChange}
        colMode={colMode}
        onToggleColMode={toggleColMode}
        onLogin={() => setShowAuth(true)}
        onLogout={handleLogout}
        onOpenProfile={() => setShowProfile(true)}
        onOpenMemberManage={() => setShowMemberManage(true)}
        onOpenGroupManage={() => setShowGroupManage(true)}
        onOpenPermGroupManage={() => setShowPermGroupManage(true)}
        onOpenNavSort={() => setShowNavSort(true)}
        onOpenDownload={() => navigate('/download')}
      />

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
        onSuccess={(u) => setUser(u)}
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
