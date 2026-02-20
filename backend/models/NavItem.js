const mongoose = require('mongoose');

const navItemSchema = new mongoose.Schema({
  url: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  emoji: { type: String, default: '🔗' },
  display_mode: { type: String, enum: ['iframe', 'redirect'], required: true },
  is_public: { type: Boolean, default: false },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  visible_group_ids: { type: [mongoose.Schema.Types.ObjectId], ref: 'Group', default: [] },
  bg_image: { type: String, default: '' },
  bg_position: { type: String, default: 'center' },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('NavItem', navItemSchema);
