import React from 'react';
import styles from '../css/components/Loader.module.css';

export default function Loader({ visible }) {
  if (!visible) return null;
  return (
    <div className={styles.overlay}>
      <div className={styles.spinner} />
    </div>
  );
}