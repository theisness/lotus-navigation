import { useState, useEffect, useCallback, useRef } from 'react';
import { navGroupApi } from '../api.js';
import { IconChevronRight, IconGripVertical, IconPlus, IconTrash, IconEdit } from './Icons.jsx';
import styles from '../css/components/GroupManageModal.module.css';

/** 把 list 里第 from 项挪到 to 位，返回新数组（order 字段一并重排） */
function moveInList(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy.map((g, i) => ({ ...g, order: i }));
}

export default function GroupManageModal({ visible, onClose, navItems = [], onSuccess }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [draggingId, setDraggingId] = useState(null);
  const overlayRef = useRef(null);
  const dragIndexRef = useRef(null);
  const dragMovedRef = useRef(false);
  // 拖拽结束时要读到最新顺序，用 ref 镜像一份，避免闭包拿到旧 state
  const groupsRef = useRef([]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);

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

  const persistOrder = useCallback(async (list) => {
    try {
      await navGroupApi.reorderGroups(list.map((g, i) => ({ id: g._id, order: i })));
      onSuccess?.();
    } catch (err) {
      setError(err.message || '排序保存失败');
      fetchGroups();
    }
  }, [onSuccess, fetchGroups]);

  const handleDragStart = useCallback((idx, e) => {
    dragIndexRef.current = idx;
    dragMovedRef.current = false;
    setDraggingId(groupsRef.current[idx]?._id ?? null);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox 必须写入 dataTransfer 才会真正开始拖拽
    try { e.dataTransfer.setData('text/plain', String(idx)); } catch { /* 忽略 */ }
  }, []);

  const handleDragEnter = useCallback((idx) => {
    const from = dragIndexRef.current;
    if (from === null || from === idx) return;
    setGroups(prev => moveInList(prev, from, idx));
    dragIndexRef.current = idx;
    dragMovedRef.current = true;
  }, []);

  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setDraggingId(null);
    if (!dragMovedRef.current) return;
    dragMovedRef.current = false;
    persistOrder(groupsRef.current);
  }, [persistOrder]);

  // 触屏用不了 HTML5 拖拽，留一组上下移按钮兜底
  const handleMoveGroup = useCallback((idx, dir) => {
    const next = moveInList(groupsRef.current, idx, idx + dir);
    if (next === groupsRef.current) return;
    setGroups(next);
    persistOrder(next);
  }, [persistOrder]);

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
              <>
              <div className={styles.sectionHint}>
                <span className={styles.hintDrag}>拖动手柄或点箭头调整顺序，菜单栏即时生效</span>
                <span className={styles.hintTap}>点箭头调整顺序，点铅笔改名，菜单栏即时生效</span>
              </div>
              <div className={styles.groupList}>
                {groups.map((group, idx) => {
                  const gid = group._id;
                  const items = getGroupItems(gid);
                  const isEditing = editingGroupId === gid;

                  return (
                    <div
                      key={gid}
                      className={`${styles.groupRow} ${draggingId === gid ? styles.groupRowDragging : ''}`}
                      draggable={!isEditing}
                      onDragStart={(e) => handleDragStart(idx, e)}
                      onDragEnter={() => handleDragEnter(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => e.preventDefault()}
                      onDragEnd={handleDragEnd}
                    >
                      <div className={styles.groupDrag} title="拖动调整顺序">
                        <IconGripVertical size={14} />
                      </div>
                      <div className={styles.groupMove}>
                        <button
                          type="button"
                          className={styles.btnIconMove}
                          onClick={() => handleMoveGroup(idx, -1)}
                          disabled={idx === 0}
                          title="上移"
                        >
                          <span className={styles.arrowUp}><IconChevronRight size={11} /></span>
                        </button>
                        <button
                          type="button"
                          className={styles.btnIconMove}
                          onClick={() => handleMoveGroup(idx, 1)}
                          disabled={idx === groups.length - 1}
                          title="下移"
                        >
                          <span className={styles.arrowDown}><IconChevronRight size={11} /></span>
                        </button>
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
                      {/* 触屏没有双击改名，给一个显式的改名按钮（桌面隐藏） */}
                      <button
                        type="button"
                        className={styles.btnIconEdit}
                        onClick={() => { setEditingGroupId(gid); setEditingTitle(group.title); }}
                        title="改名"
                        aria-label="改名"
                      >
                        <IconEdit size={13} />
                      </button>
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
              </>
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
                        ? <span className={styles.itemIconImg} style={{ maskImage: `url(/images/${item.icon})`, WebkitMaskImage: `url(/images/${item.icon})` }} />
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