const SiteSetting = require('../models/SiteSetting');

async function getSetting(key) {
  const doc = await SiteSetting.findOne({ key });
  return doc ? doc.value : null;
}

async function setSetting(key, value) {
  return SiteSetting.findOneAndUpdate(
    { key },
    { value },
    { upsert: true, new: true }
  );
}

module.exports = { getSetting, setSetting };
