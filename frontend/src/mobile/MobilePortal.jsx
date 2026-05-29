import { useNavigate } from 'react-router-dom';
import MobileHomepage from './MobileHomepage.jsx';
import MobileBottomBar from './MobileBottomBar.jsx';
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

export default function MobilePortal() {
  const navigate = useNavigate();

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
    setShowNavSort,
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
  } = usePortal();

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
            onLoad={() => {}}
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
        visible={showGroupManage}
        onClose={() => setShowGroupManage(false)}
      />
      <GroupManageModal
        visible={showGroupManage}
        onClose={() => setShowGroupManage(false)}
        navItems={navItems}
        onSuccess={handleAddNavSuccess}
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
