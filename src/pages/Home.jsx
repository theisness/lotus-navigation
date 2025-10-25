import React from 'react';
import styles from '../css/pages/Home.module.css';
import Button from '../components/Button.jsx';

export default function Home() {
  return (
    <div className={styles.container}>
      <h1>首页</h1>
      <p>这是使用 React + Vite 的示例页面。</p>
      <Button>点我</Button>
    </div>
  );
}