const siteSettingService = require('../services/siteSettingService');

// GET /api/settings/theme
async function getTheme(req, res) {
  try {
    const theme = await siteSettingService.getSetting('theme');
    res.json({ theme: theme || 'dark' });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// PUT /api/settings/theme (admin only)
async function setTheme(req, res) {
  try {
    const { theme } = req.body;
    if (!theme) {
      return res.status(400).json({ error: '缺少主题参数' });
    }
    await siteSettingService.setSetting('theme', theme);
    res.json({ theme });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
}

module.exports = { getTheme, setTheme };
