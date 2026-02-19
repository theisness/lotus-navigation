import React from 'react';
import styles from '../css/components/IframeView.module.css';

export default function IframeView({ url, visible, onLoad, reloadKey }) {
  return (
    <div className={`${styles.wrap} ${visible ? '' : styles.hidden}`}> 
      <iframe
        key={reloadKey}
        src={url}
        className={styles.iframe}
        frameBorder="0"
        allowFullScreen
        onLoad={onLoad}
        title={url}
      />
    </div>
  );
}