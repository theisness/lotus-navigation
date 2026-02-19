const { upload } = require('../services/uploadService');

const uploadImage = (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.message === '不支持的图片格式') {
        return res.status(400).json({ error: '不支持的图片格式' });
      }
      return res.status(500).json({ error: '上传失败' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请选择图片文件' });
    }

    res.json({ filename: req.file.filename });
  });
};

module.exports = { uploadImage };
