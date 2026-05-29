import { useState, useEffect, useCallback, useRef } from 'react';
import { navGroupApi } from '../api.js';
import { IconChevronRight, IconGripVertical, IconPlus, IconTrash } from './Icons.jsx';
import styles from '../css/components/GroupManageModal.module.css';

export default function GroupManageModal({ visible, onClose, navItems = [], onSuccess }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const overlayRef = useRef(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await navGroupApi.getGroups();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchGroups();
  }, [visible, fetchGroups]);

  const handleCreateGroup = useCallback(async () => {
    const title = newGroupTitle.trim();
    if (!title) return;
    try {
      await navGroupApi.createGroup(title);
      setNewGroupTitle('');
      fetchGroups();
      onSuccess?.();
    } catch (err) {
      setError(err.message || '创建失败');
    }
  }, [newGroupTitle, fetchGroups, onSuccess]);

  const handleUpdateGroup = useCallback(async (id) => {
    const title = editingTitle.trim();
    if (!title) return;
    try {
      await navGroupApi.updateGroup(id, title);
      setEditingGroupId(null);
      fetchGroups();
    } catch (err) {
      setError(err.message || '更新失败');
    }
  }, [editingTitle, fetchGroups]);

  const handleDeleteGroup = useCallback(async (id) => {
    if (!window.confirm('确定删除该分组吗？导航项将变为未分组状态。')) return;
    try {
      await navGroupApi.deleteGroup(id);
      fetchGroups();
      onSuccess?.();
    } catch (err) {
      setError(err.message || '删除失败');
    }
  }, [fetchGroups, onSuccess]);

  const handleMoveItem = useCallback(async (itemId, nav_group_id) => {
    try {
      await navGroupApi.setItemGroup(itemId, nav_group_id);
      fetchGroups();
      onSuccess?.();
    } catch (err) {
      setError(err.message || '移动失败');
    }
  }, [fetchGroups, onSuccess]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) onClose?.();
  }, [onClose]);

  if (!visible) return null;

  const getGroupItems = (groupId) => navItems.filter(it => it.nav_group_id === groupId);
  const ungroupedItems = navItems.filter(it => !it.nav_group_id);

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        <h2 className={styles.title}>管理导航分组</h2>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.body}>
          {/* 左侧：分组列表 */}
          <div className={styles.leftPanel}>
            <div className={styles.sectionTitle}>分组</div>
            <div className={styles.createRow}>
              <input
                className={styles.input}
                value={newGroupTitle}
                onChange={(e) => setNewGroupTitle(e.target.value)}
                placeholder="新分组名称"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
              />
              <button type="button" className={styles.btnPrimary} onClick={handleCreateGroup}>
                <IconPlus size={14} /> 新建
              </button>
            </div>

            {loading ? (
              <div className={styles.loading}>加载中...</div>
            ) : groups.length === 0 ? (
              <div className={styles.empty}>暂无分组</div>
            ) : (
              <div className={styles.groupList}>
                {groups.map(group => {
                  const gid = group._id;
                  const items = getGroupItems(gid);
                  const isEditing = editingGroupId === gid;

                  return (
                    <div key={gid} className={styles.groupRow}>
                      <div className={styles.groupDrag}>
                        <IconGripVertical size={14} />
                      </div>
                      {isEditing ? (
                        <input
                          className={styles.inputInline}
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateGroup(gid);
                            if (e.key === 'Escape') setEditingGroupId(null);
                          }}
                          onBlur={() => handleUpdateGroup(gid)}
                          autoFocus
                        />
                      ) : (
                        <span
                          className={styles.groupTitle}
                          onDoubleClick={() => {
                            setEditingGroupId(gid);
                            setEditingTitle(group.title);
                          }}
                          title="双击编辑"
                        >
                          {group.title}
                        </span>
                      )}
                      <span className={styles.groupCount}>{items.length}</span>
                      <button
                        type="button"
                        className={styles.btnIconDanger}
                        onClick={() => handleDeleteGroup(gid)}
                        title="删除分组"
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 右侧：导航项 */}
          <div className={styles.rightPanel}>
            <div className={styles.sectionTitle}>导航项</div>
            <div className={styles.itemList}>
              {navItems.length === 0 ? (
                <div className={styles.empty}>暂无导航项</div>
              ) : (
                navItems.map(item => (
                  <div key={item._id} className={styles.itemRow}>
                    <span className={styles.itemIcon}>
                      {item.icon
                        ? <img src={`/images/${item.icon}`} alt="" className={styles.itemIconImg} />
                        : '🔗'
                      }
                    </span>
                    <span className={styles.itemTitle}>{item.title}</span>
                    <select
                      className={styles.groupSelect}
                      value={item.nav_group_id || ''}
                      onChange={(e) => handleMoveItem(item._id, e.target.value || null)}
                    >
                      <option value="">未分组</option>
                      {groups.map(g => (
                        <option key={g._id} value={g._id}>{g.title}</option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}