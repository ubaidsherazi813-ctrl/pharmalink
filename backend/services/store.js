const fs = require('fs');
const path = require('path');
const LinkedList = require('../structures/LinkedList');

// Har cheez ki apni linked list. Database koi nahi (Pure DSA)
const store = {
  medicines: new LinkedList(),
  users:     new LinkedList(),
  sales:     new LinkedList(),
  suppliers: new LinkedList(),
  activity:  new LinkedList(),
  customers: new LinkedList(),
};

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

// Snapshot: restart par data bachane ke liye list ko JSON file mein likhte hain
function save(name) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = path.join(DATA_DIR, `${name}.json.tmp`);
    fs.writeFileSync(tmp, JSON.stringify(store[name].toArray(), null, 2));
    fs.renameSync(tmp, path.join(DATA_DIR, `${name}.json`));
  } catch (e) { console.error(`[store] could not save ${name}:`, e.message); }
}

function loadAll() {
  for (const name of Object.keys(store)) {
    const file = path.join(DATA_DIR, `${name}.json`);
    try {
      if (fs.existsSync(file)) store[name] = LinkedList.fromArray(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch (e) { console.error(`[store] could not load ${name}:`, e.message); }
  }
}

module.exports = { store, save, loadAll, DATA_DIR };
