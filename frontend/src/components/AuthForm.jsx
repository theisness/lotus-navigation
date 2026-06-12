import { useState, useCallback, useRef, useEffect } from 'react';
import { authApi, setToken } from '../api.js';
import styles from '../css/components/AuthForm.module.css';

export default function AuthForm({ visible, onClose, onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef(null);
  const overlayRef = useRef(null);

  // 清理倒计时
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 重置表单
  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setCode('');
    setError('');
  }, []);

  // 切换模式
  const handleSwitchMode = useCallback(() => {
    setMode(m => m === 'login' ? 'register' : 'login');
    resetForm();
  }, [resetForm]);

  // 切到指定模式（登录↔忘记密码）
  const goMode = useCallback((target) => {
    setMode(target);
    resetForm();
  }, [resetForm]);

  // 发送验证码
  const handleSendCode = useCallback(async () => {
    if (countdown > 0 || !email) return;
    try {
      await authApi.sendCode(email);
      setCountdown(60);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message || '验证码发送失败');
    }
  }, [countdown, email]);

  // 提交表单
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const data = await authApi.login(email, password);
        setToken(data.token);
        onLoginSuccess?.(data.user);
      } else if (mode === 'register') {
        await authApi.register(email, password, code);
        // 注册成功后自动登录
        const data = await authApi.login(email, password);
        setToken(data.token);
        onLoginSuccess?.(data.user);
      } else {
        // 重置密码后自动登录
        await authApi.resetPassword(email, password, code);
        const data = await authApi.login(email, password);
        setToken(data.token);
        onLoginSuccess?.(data.user);
      }
      resetForm();
      onClose?.();
    } catch (err) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  }, [mode, email, password, code, onLoginSuccess, onClose, resetForm]);

  // 点击遮罩关闭
  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) {
      onClose?.();
    }
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">✕</button>

        <h2 className={styles.title}>{mode === 'login' ? '登录' : mode === 'register' ? '注册' : '重置密码'}</h2>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-email">邮箱</label>
            <input
              id="auth-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-password">
              {mode === 'reset' ? '新密码' : '密码'}
            </label>
            <input
              id="auth-password"
              className={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'reset' ? '请输入新密码' : '请输入密码'}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {(mode === 'register' || mode === 'reset') && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="auth-code">验证码</label>
              <div className={styles.codeRow}>
                <input
                  id="auth-code"
                  className={styles.input}
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="6位验证码"
                  required
                  maxLength={6}
                  autoComplete="one-time-code"
                />
                <button
                  type="button"
                  className={styles.codeBtn}
                  onClick={handleSendCode}
                  disabled={countdown > 0 || !email}
                >
                  {countdown > 0 ? `${countdown}s` : '发送验证码'}
                </button>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <button
              type="button"
              className={styles.switchBtn}
              style={{ alignSelf: 'flex-end' }}
              onClick={() => goMode('reset')}
            >
              忘记密码？
            </button>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? '处理中...' : (mode === 'login' ? '登录' : mode === 'register' ? '注册' : '重置密码')}
          </button>
        </form>

        <div className={styles.switchRow}>
          {mode === 'reset' ? (
            <>
              <span className={styles.switchText}>想起密码了？</span>
              <button type="button" className={styles.switchBtn} onClick={() => goMode('login')}>
                去登录
              </button>
            </>
          ) : (
            <>
              <span className={styles.switchText}>
                {mode === 'login' ? '没有账号？' : '已有账号？'}
              </span>
              <button type="button" className={styles.switchBtn} onClick={handleSwitchMode}>
                {mode === 'login' ? '去注册' : '去登录'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
