import { useState, useCallback, useRef, useEffect } from 'react';
import { authApi, uploadApi } from '../api.js';
import styles from '../css/components/ProfileForm.module.css';

function DefaultAvatar({ name }) {
  const letter = (name && name.trim() ? name : '?').charAt(0).toUpperCase();
  return <span className={styles.defaultAvatar}>{letter}</span>;
}

export default function ProfileForm({ visible, onClose, user, onSuccess }) {
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (visible && user) {
      setNickname(user.nickname || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
      setImagePreview(user.avatar ? `/images/${user.avatar}` : '');
      setImageFile(null);
      setError('');
    }
  }, [visible, user]);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let uploadedAvatar = avatar;
      if (imageFile) {
        const uploadRes = await uploadApi.uploadImage(imageFile);
        uploadedAvatar = uploadRes.filename;
      }

      const data = await authApi.updateProfile({
        nickname: nickname.trim(),
        bio: bio.trim(),
        avatar: uploadedAvatar,
      });

      onSuccess?.(data);
      onClose?.();
    } catch (err) {
      setError(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  }, [nickname, bio, avatar, imageFile, onSuccess, onClose]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) onClose?.();
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="关闭">✕</button>
        <h2 className={styles.title}>个人信息</h2>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>头像</label>
            <div className={styles.avatarRow}>
              <div
                className={styles.avatarWrap}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="" className={styles.avatarImg} />
                ) : (
                  <DefaultAvatar name={nickname || user?.email} />
                )}
              </div>
              <span className={styles.avatarHint}>点击更换头像</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageChange}
              className={styles.fileInput}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="profile-nickname">昵称</label>
            <input
              id="profile-nickname"
              className={styles.input}
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入昵称"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="profile-bio">简介</label>
            <textarea
              id="profile-bio"
              className={styles.textarea}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="简短介绍自己"
              rows={3}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </button>
        </form>
      </div>
    </div>
  );
}
