const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const router = express.Router();

// 下载目录：优先从 config.downloadDir 读取，默认 dist
const DOWNLOAD_DIR = path.resolve(__dirname, config.downloadDir || '../../dist');

// 通用：查找目录下最新的指定后缀文件并下载
function downloadLatest(ext, label, res) {
  try {
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      return res.status(404).json({ error: '下载目录不存在' });
    }

    const files = fs.readdirSync(DOWNLOAD_DIR)
      .filter(f => f.toLowerCase().endsWith(ext))
      .map(f => {
        const stat = fs.statSync(path.join(DOWNLOAD_DIR, f));
        return { name: f, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      return res.status(404).json({ error: `暂无可下载的${label}安装包` });
    }

    const latest = files[0].name;
    res.download(path.join(DOWNLOAD_DIR, latest), latest);
  } catch (err) {
    console.error('下载失败:', err);
    res.status(500).json({ error: '下载失败' });
  }
}

// GET /api/download/latest-apk
router.get('/latest-apk', (_req, res) => downloadLatest('.apk', '安卓', res));

// GET /api/download/latest-ipa
router.get('/latest-ipa', (_req, res) => downloadLatest('.ipa', 'iOS', res));

module.exports = router;
