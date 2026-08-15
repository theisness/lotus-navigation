import { useState, useRef, useEffect, useMemo } from 'react';
import ThemePicker from './ThemePicker.jsx';
import {
  IconHome, IconPalette, IconSun, IconMoon,
  IconDownload, IconRefresh, IconFullscreen, IconFullscreenExit,
  IconLink, IconExternalLink, IconList, IconChevronRight,
  IconCollapse, IconExpandAll, IconCollapseAll
} from './Icons.jsx';
import ColumnPicker from './ColumnPicker.jsx';
import { rewriteSsoUrl } from '../utils/ssoRewrite.js';
import styles from '../css/components/Sidebar.module.css';

/** 统一成字符串再比，避免 ObjectId / 字符串混用导致匹配失败 */
function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

export default function Sidebar({
  navItems = [],
  selectedId,
  currentTitle,
  currentUrl,
  onSelect,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
  onCollapse,
  theme,
  onToggleTheme,
  onGoHome,
  isAdmin,
  colorTheme,
  onColorThemeChange,
  layoutMode,
  onToggleLayout,
  onOpenDownload,
  groups = [],
  collapsedGroups = {},
  onToggleGroup,
  onGroupNavigate,
  onExpandAll,
  onCollapseAll,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showColPicker, setShowColPicker] = useState(false);
  const pickerRef = useRef(null);
  const colPickerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) {
        setShowColPicker(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // 只展示「当前用户可见项」非空的分组；无权限导致整组为空时，分组标签一并隐藏
  const visibleGroups = useMemo(() => {
    return groups
      .map((group) => ({
        group,
        items: navItems.filter((it) => sameId(it.nav_group_id, group._id)),
      }))
      .filter(({ items }) => items.length > 0);
  }, [groups, navItems]);

  const ungroupedItems = useMemo(
    () => navItems.filter((it) => !it.nav_group_id),
    [navItems]
  );

  const handleItemClick = (e, item) => {
    e.preventDefault();
    if (item.display_mode === 'redirect') {
      window.open(rewriteSsoUrl(item.url), '_blank', 'noopener,noreferrer');
    } else {
      onSelect?.(item);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div
          className={styles.brand}
          onClick={onGoHome}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGoHome?.(); } }}
          style={{ cursor: 'pointer' }}
        >
          <img src="/blue-lotus.png" alt="莲花导航" className={styles.logo} />
          <div className={styles.brandText}>
            <div className={styles.brandCnRow}>
              <span className={styles.brandCn}>莲花导航</span>
              <img src="/logo1.png" alt="印章" className={styles.stamp} />
            </div>
            <span className={styles.brandEn}>Lotus Navigation</span>
          </div>
        </div>
        {currentTitle && (
          <div className={styles.currentBox}>
            <div className={styles.currentTitle}>{currentTitle}</div>
            <div className={styles.currentUrl}>{currentUrl}</div>
            <div className={styles.actions}>
              <button className={styles.iconBtn} onClick={onRefresh} title="刷新"><IconRefresh size={15} /></button>
              <button className={styles.iconBtn} onClick={onToggleFullscreen} title="全屏">
                {isFullscreen ? <IconFullscreenExit size={15} /> : <IconFullscreen size={15} />}
              </button>
            </div>
          </div>
        )}
      </div>

      <nav className={styles.nav}>
        {/* 分组列表：无可见项的分组不渲染标签 */}
        {visibleGroups.map(({ group, items: groupItems }) => {
          const isCollapsed = collapsedGroups[group._id];
          return (
            <div key={group._id} className={styles.groupSection}>
              <div
                className={styles.groupHeader}
                onClick={() => { onToggleGroup?.(group._id); onGroupNavigate?.(group._id); }}
              >
                <span className={`${styles.chevron} ${isCollapsed ? styles.chevronCollapsed : ''}`}>
                  <IconChevronRight size={14} />
                </span>
                <span className={styles.groupTitle}>{group.title}</span>
                <span className={styles.groupCount}>{groupItems.length}</span>
              </div>
              {!isCollapsed && (
                <ul className={styles.groupItems}>
                  {groupItems.map(item => (
                    <li key={item._id}>
                      <a
                        href="#"
                        className={`${styles.link} ${selectedId === item._id ? styles.active : ''}`}
                        onClick={(e) => handleItemClick(e, item)}
                      >
                        <span className={styles.linkIcon}>
                          {item.icon
                            ? <span className={styles.linkIconImg} style={{ maskImage: `url(/images/${item.icon})`, WebkitMaskImage: `url(/images/${item.icon})` }} />
                            : <IconLink size={20} />
                          }
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
        {/* 未分组：仅当还有其他可见分组时才显示「未分组」标签 */}
        {ungroupedItems.length > 0 && (
          <div className={styles.ungroupedSection}>
            {visibleGroups.length > 0 && <div className={styles.ungroupedTitle}>未分组</div>}
            {ungroupedItems.map(item => (
              <a
                key={item._id}
                href="#"
                className={`${styles.link} ${selectedId === item._id ? styles.active : ''}`}
                onClick={(e) => handleItemClick(e, item)}
              >
                <span className={styles.linkIcon}>
                  {item.icon
                    ? <span className={styles.linkIconImg} style={{ maskImage: `url(/images/${item.icon})`, WebkitMaskImage: `url(/images/${item.icon})` }} />
                    : <IconLink size={20} />
                  }
                </span>
                <span>{item.title}</span>
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* 分组操作按钮：仅当存在可见分组时显示 */}
      {visibleGroups.length > 0 && (
        <div className={styles.groupActions}>
          <button className={styles.groupActionBtn} onClick={onExpandAll} title="全部展开">
            <IconExpandAll size={14} />
          </button>
          <button className={styles.groupActionBtn} onClick={onCollapseAll} title="全部折叠">
            <IconCollapseAll size={14} />
          </button>
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.footerIconBtn} onClick={onGoHome} title="主页"><IconHome size={16} /></button>
        <div className={styles.pickerWrap} ref={colPickerRef}>
          <button
            className={styles.footerIconBtn}
            onClick={() => setShowColPicker(v => !v)}
            title="列数"
          >
            <IconList size={16} />
          </button>
          <ColumnPicker
            visible={showColPicker}
            current={layoutMode}
            onSelect={(n) => { onToggleLayout(n); setShowColPicker(false); }}
            onClose={() => setShowColPicker(false)}
          />
        </div>
        {isAdmin && (
          <div className={styles.pickerWrap} ref={pickerRef}>
            <button
              className={styles.footerIconBtn}
              onClick={() => setShowPicker(v => !v)}
              title="主题颜色"
            ><IconPalette size={16} /></button>
            <ThemePicker
              visible={showPicker}
              currentColorTheme={colorTheme}
              onSelect={(key) => { onColorThemeChange?.(key); setShowPicker(false); }}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}
        <button className={styles.footerIconBtn} onClick={onToggleTheme} title={theme === 'dark' ? '切换日间模式' : '切换夜间模式'}>
          {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
        <button className={styles.footerIconBtn} onClick={onOpenDownload} title="下载客户端"><IconDownload size={16} /></button>
      </div>

      <button className={styles.collapseBtn} onClick={onCollapse} title="收起侧栏" aria-label="收起侧栏">
        <IconCollapse size={14} />
      </button>
    </div>
  );
}
