import styles from '../css/components/IframeView.module.css';
import { rewriteSsoUrl } from '../utils/ssoRewrite.js';

export default function IframeView({ openedItems, activeId, onLoad }) {
  return (
    <div className={styles.wrap}>
      {openedItems.map((item) => (
        <div
          key={item._id}
          className={`${styles.frame} ${item._id === activeId ? styles.frameActive : styles.frameHidden}`}
        >
          <iframe
            src={rewriteSsoUrl(item.url)}
            className={styles.iframe}
            frameBorder="0"
            allowFullScreen
            onLoad={() => { if (item._id === activeId) onLoad?.(); }}
            title={item.title || item.url}
          />
        </div>
      ))}
    </div>
  );
}
