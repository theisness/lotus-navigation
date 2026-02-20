import { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi } from '../api.js';
import styles from '../css/components/MemberManage.module.css';

function DefaultAvatar({ name }) {
  const letter = (name && name.trim() ? name : '?').charAt(0).toUpperCase();
  return <span className={styles.defaultAvatar}>{letter}</span>;
}

export default function MemberManage({ visible, onClose }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailUser, setDetailUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const overlayRef = useRef(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getMembers();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || '加载失败');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchList();
  }, [visible, fetchList]);

  const handleViewDetail = useCallback(async (id) => {
    try {
      const user = await adminApi.getMemberById(id);
      setDetailUser(user);
    } catch (err) {
      setError(err.message || '获取详情失败');
    }
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('确定要删除该成员吗？此操作不可恢复。')) return;
    setDeletingId(id);
    try {
      await adminApi.deleteMember(id);
      setList((prev) => prev.filter((u) => u._id !== id && u.id !== id));
      setDetailUser((u) => (u && (u._id === id || u.id === id) ? null : u));
    } catch (err) {
      setError(err.message || '删除失败');
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) onClose?.();
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="关闭">✕</button>
        <h2 className={styles.title}>成员管理</h2>

        {error && <div className={styles.error}>{error}</div>}

        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : (
          <div className={styles.list}>
            {list.length === 0 ? (
              <div className={styles.empty}>暂无成员</div>
            ) : (
              list.map((u) => {
                const uid = u._id || u.id;
                return (
                  <div key={uid} className={styles.row}>
                    <div className={styles.avatarWrap}>
                      {u.avatar ? (
                        <img src={u.avatar.startsWith('/') ? u.avatar : `/images/${u.avatar}`} alt="" className={styles.avatarImg} />
                      ) : (
                        <DefaultAvatar name={u.nickname || u.email} />
                      )}
                    </div>
                    <div className={styles.info}>
                      <span className={styles.name}>{u.nickname || u.email || '—'}</span>
                      <span className={styles.email}>{u.email}</span>
                      {u.groups && u.groups.length > 0 && (
                        <span className={styles.groups}>
                          分组：{u.groups.map((g) => g.name).join('、')}
                        </span>
                      )}
                    </div>
                    <div className={styles.actions}>
                      <button type="button" className={styles.btnSecondary} onClick={() => handleViewDetail(uid)}>
                        查看
                      </button>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        onClick={() => handleDelete(uid)}
                        disabled={deletingId === uid}
                      >
                        {deletingId === uid ? '删除中...' : '删除'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {detailUser && (
          <div className={styles.detailOverlay} onClick={() => setDetailUser(null)}>
            <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.detailTitle}>成员详情</h3>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>邮箱</span>
                <span>{detailUser.email}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>昵称</span>
                <span>{detailUser.nickname || '—'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>简介</span>
                <span>{detailUser.bio || '—'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>角色</span>
                <span>{detailUser.is_admin ? '管理员' : '普通成员'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>所属分组</span>
                <span>
                  {detailUser.groups && detailUser.groups.length > 0
                    ? detailUser.groups.map((g) => g.name).join('、')
                    : '—'}
                </span>
              </div>
              <button type="button" className={styles.btnSecondary} onClick={() => setDetailUser(null)}>
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
