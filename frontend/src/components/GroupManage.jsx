import { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi } from '../api.js';
import styles from '../css/components/GroupManage.module.css';

export default function GroupManage({ visible, onClose }) {
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [addMemberGroupId, setAddMemberGroupId] = useState(null);
  const overlayRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [groupsData, membersData] = await Promise.all([
        adminApi.getGroups(),
        adminApi.getMembers(),
      ]);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setMembers(Array.isArray(membersData) ? membersData : []);
    } catch (err) {
      setError(err.message || '加载失败');
      setGroups([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchData();
  }, [visible, fetchData]);

  const getMembersInGroup = useCallback((groupId) => {
    return members.filter((m) => m.groups && m.groups.some((g) => (g._id || g.id) === groupId));
  }, [members]);

  const handleCreateGroup = useCallback(async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setError('');
    try {
      await adminApi.createGroup(name);
      setNewGroupName('');
      fetchData();
    } catch (err) {
      setError(err.message || '创建失败');
    }
  }, [newGroupName, fetchData]);

  const handleUpdateGroup = useCallback(async (id, name) => {
    if (!name.trim()) return;
    setError('');
    try {
      await adminApi.updateGroup(id, name);
      setEditingGroup(null);
      fetchData();
    } catch (err) {
      setError(err.message || '更新失败');
    }
  }, [fetchData]);

  const handleDeleteGroup = useCallback(async (id) => {
    if (!window.confirm('确定删除该分组吗？将同时移除该分组下所有成员关联。')) return;
    setError('');
    try {
      await adminApi.deleteGroup(id);
      setAddMemberGroupId(null);
      fetchData();
    } catch (err) {
      setError(err.message || '删除失败');
    }
  }, [fetchData]);

  const handleAddMemberToGroup = useCallback(async (groupId, userId) => {
    const user = members.find((m) => (m._id || m.id) === userId);
    if (!user) return;
    const currentIds = (user.groups || []).map((g) => g._id || g.id);
    if (currentIds.includes(groupId)) return;
    setError('');
    try {
      await adminApi.setUserGroups(userId, [...currentIds, groupId]);
      fetchData();
    } catch (err) {
      setError(err.message || '添加失败');
    }
  }, [members, fetchData]);

  const handleRemoveMemberFromGroup = useCallback(async (groupId, userId) => {
    const user = members.find((m) => (m._id || m.id) === userId);
    if (!user) return;
    const currentIds = (user.groups || []).map((g) => g._id || g.id).filter((id) => id !== groupId);
    setError('');
    try {
      await adminApi.setUserGroups(userId, currentIds);
      fetchData();
    } catch (err) {
      setError(err.message || '移除失败');
    }
  }, [members, fetchData]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) onClose?.();
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="关闭">✕</button>
        <h2 className={styles.title}>成员分组</h2>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.createRow}>
          <input
            className={styles.input}
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="新分组名称"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
          />
          <button type="button" className={styles.btnPrimary} onClick={handleCreateGroup}>
            新建分组
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : (
          <div className={styles.groupList}>
            {groups.length === 0 ? (
              <div className={styles.empty}>暂无分组，请先新建</div>
            ) : (
              groups.map((group) => {
                const gid = group._id || group.id;
                const inGroup = getMembersInGroup(gid);
                const isEditing = editingGroup === gid;
                const isAdding = addMemberGroupId === gid;
                const notInGroup = members.filter(
                  (m) => !(m.groups || []).some((g) => (g._id || g.id) === gid)
                );

                return (
                  <div key={gid} className={styles.groupCard}>
                    <div className={styles.groupHeader}>
                      {isEditing ? (
                        <input
                          className={styles.inputInline}
                          defaultValue={group.name}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateGroup(gid, e.target.value);
                            if (e.key === 'Escape') setEditingGroup(null);
                          }}
                          onBlur={(e) => {
                            if (e.target.value.trim()) handleUpdateGroup(gid, e.target.value);
                            setEditingGroup(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className={styles.groupName}>{group.name}</span>
                      )}
                      {!isEditing && (
                        <div className={styles.groupActions}>
                          <button type="button" className={styles.btnSmall} onClick={() => setEditingGroup(gid)}>
                            编辑
                          </button>
                          <button type="button" className={styles.btnSmallDanger} onClick={() => handleDeleteGroup(gid)}>
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                    <div className={styles.memberList}>
                      <span className={styles.memberLabel}>成员：</span>
                      {inGroup.length === 0 ? (
                        <span className={styles.muted}>暂无</span>
                      ) : (
                        inGroup.map((m) => (
                          <span key={m._id || m.id} className={styles.memberTag}>
                            {m.nickname || m.email}
                            <button
                              type="button"
                              className={styles.removeTag}
                              onClick={() => handleRemoveMemberFromGroup(gid, m._id || m.id)}
                              aria-label="移出分组"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                      {notInGroup.length > 0 && (
                        <>
                          {isAdding ? (
                            <div className={styles.addDropdown}>
                              {notInGroup.map((m) => (
                                <button
                                  key={m._id || m.id}
                                  type="button"
                                  className={styles.addOption}
                                  onClick={() => {
                                    handleAddMemberToGroup(gid, m._id || m.id);
                                    setAddMemberGroupId(null);
                                  }}
                                >
                                  {m.nickname || m.email}
                                </button>
                              ))}
                              <button type="button" className={styles.addOption} onClick={() => setAddMemberGroupId(null)}>
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={styles.btnAddMember}
                              onClick={() => setAddMemberGroupId(gid)}
                            >
                              + 添加成员
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
