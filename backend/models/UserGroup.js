const mongoose = require('mongoose');

const userGroupSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
});
userGroupSchema.index({ user_id: 1, group_id: 1 }, { unique: true });

module.exports = mongoose.model('UserGroup', userGroupSchema);
