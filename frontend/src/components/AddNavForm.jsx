import { useState, useCallback, useRef, useEffect } from 'react';
import { navApi, uploadApi } from '../api.js';
import styles from '../css/components/AddNavForm.module.css';

export default function AddNavForm({ visible, onClose, onSuccess, isAdmin, editItem }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🔗');
  const [displayMode, setDisplayMode] = useState('iframe');
  const [isPublic, setIsPublic] = useState(false);
  const [bgImage, setBgImage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const overlayRef = useRef(null);
  const fileInputRef = useRef(null);

  const isEdit = Boolean(editItem);

  // 编辑模式下填充表单
  useEffect(() => {
    if (editItem) {
      setUrl(editItem.url || '');
      setTitle(editItem.title || '');
      setDescription(editItem.description || '');
      setEmoji(editItem.emoji || '🔗');
      setDisplayMode(editItem.display_mode || 'iframe');
      setIsPublic(editItem.is_public || false);
      setBgImage(editItem.bg_image || '');
      setImagePreview(editItem.bg_image ? `/images/${editItem.bg_image}` : '');
      setImageFile(null);
      setError('');
      setFieldErrors({});
    }
  }, [editItem]);

  const resetForm = useCallback(() => {
    setUrl('');
    setTitle('');
    setDescription('');
    setEmoji('🔗');
    setDisplayMode('iframe');
    setIsPublic(false);
    setBgImage('');
    setImageFile(null);
    setImagePreview('');
    setError('');
    setFieldErrors({});
  }, []);

  const validate = useCallback(() => {
    const errors = {};
    if (!url.trim()) errors.url = '请输入网站地址';
    if (!title.trim()) errors.title = '请输入标题';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [url, title]);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setError('');
    setLoading(true);

    try {
      let uploadedImage = bgImage;

      // 如果选择了图片文件，先上传
      if (imageFile) {
        const uploadRes = await uploadApi.uploadImage(imageFile);
        uploadedImage = uploadRes.filename;
      }

      await (isEdit
        ? navApi.updateNavItem(editItem._id, {
            url: url.trim(),
            title: title.trim(),
            description: description.trim(),
            emoji,
            display_mode: displayMode,
            is_public: isAdmin ? isPublic : false,
            bg_image: uploadedImage,
          })
        : navApi.createNavItem({
            url: url.trim(),
            title: title.trim(),
            description: description.trim(),
            emoji,
            display_mode: displayMode,
            is_public: isAdmin ? isPublic : false,
            bg_image: uploadedImage,
          })
      );

      resetForm();
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.message || '添加失败');
    } finally {
      setLoading(false);
    }
  }, [validate, bgImage, imageFile, url, title, description, emoji, displayMode, isAdmin, isPublic, resetForm, onSuccess, onClose, isEdit, editItem]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) {
      onClose?.();
    }
  }, [onClose]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose?.();
  }, [resetForm, onClose]);

  if (!visible) return null;

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={handleClose} aria-label="关闭">✕</button>
        <h2 className={styles.title}>{isEdit ? '编辑导航项' : '添加导航项'}</h2>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="nav-url">网站地址 *</label>
            <input
              id="nav-url"
              className={`${styles.input} ${fieldErrors.url ? styles.inputError : ''}`}
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
            {fieldErrors.url && <span className={styles.fieldError}>{fieldErrors.url}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="nav-title">标题 *</label>
            <input
              id="nav-title"
              className={`${styles.input} ${fieldErrors.title ? styles.inputError : ''}`}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="网站名称"
            />
            {fieldErrors.title && <span className={styles.fieldError}>{fieldErrors.title}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="nav-desc">描述</label>
            <input
              id="nav-desc"
              className={styles.input}
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="简短描述"
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field} style={{ flex: 1 }}>
              <label className={styles.label} htmlFor="nav-emoji">Emoji Logo</label>
              <input
                id="nav-emoji"
                className={styles.input}
                type="text"
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                maxLength={2}
              />
            </div>
            <div className={styles.field} style={{ flex: 2 }}>
              <label className={styles.label} htmlFor="nav-mode">显示模式</label>
              <select
                id="nav-mode"
                className={styles.select}
                value={displayMode}
                onChange={e => setDisplayMode(e.target.value)}
              >
                <option value="iframe">iframe 内嵌</option>
                <option value="redirect">新标签页打开</option>
              </select>
            </div>
          </div>

          {isAdmin && (
            <div className={styles.switchField}>
              <label className={styles.switchLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                />
                <span className={styles.switchTrack}>
                  <span className={styles.switchThumb} />
                </span>
                公共项目（所有用户可见）
              </label>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>背景图片</label>
            <div
              className={styles.uploadArea}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="预览" className={styles.preview} />
              ) : (
                <span className={styles.uploadHint}>点击上传图片</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageChange}
              className={styles.fileInput}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? '提交中...' : (isEdit ? '保存' : '添加')}
          </button>
        </form>
      </div>
    </div>
  );
}
