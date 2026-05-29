const mongoose = require('mongoose');
const navGroupSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});
module.exports = mongoose.model('NavGroup', navGroupSchema);