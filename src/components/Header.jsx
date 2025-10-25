import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../css/components/Header.module.css';

export default function Header() {
  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>索引 SSBX</div>
      <ul className={styles.menu}>
        <li><Link to="/">首页</Link></li>
        <li><Link to="/about">关于</Link></li>
      </ul>
    </nav>
  );
}