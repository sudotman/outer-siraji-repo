const fs = require('fs');

module.exports = function () {
  try {
    const raw = fs.readFileSync('data/dictionary.json', 'utf8');
    const items = JSON.parse(raw);
    if (Array.isArray(items)) return items;
    return [];
  } catch (e) {
    return [];
  }
};


