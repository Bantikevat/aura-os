const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class MemoryStore {
  constructor(storagePath) {
    this.storagePath = storagePath || path.join(__dirname, '../../../../data/memories.json');
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.storagePath)) {
      fs.writeFileSync(this.storagePath, JSON.stringify([], null, 2), 'utf8');
    }
  }

  _load() {
    try {
      const data = fs.readFileSync(this.storagePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  _save(memories) {
    fs.writeFileSync(this.storagePath, JSON.stringify(memories, null, 2), 'utf8');
  }

  addMemory({ category, content, source = 'system', confidence = 1.0, tags = [] }) {
    const memories = this._load();
    const newRecord = {
      id: 'mem_' + crypto.randomBytes(6).toString('hex'),
      category, // 'fact' | 'preference' | 'goal' | 'commitment' | 'project' | 'episode' | 'decision'
      content,
      source,
      confidence,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      verifiedByUser: false
    };
    memories.push(newRecord);
    this._save(memories);
    return newRecord;
  }

  getAll() {
    return this._load();
  }

  findByCategory(category) {
    return this._load().filter(m => m.category === category);
  }

  search(query) {
    const q = query.toLowerCase();
    return this._load().filter(m => 
      m.content.toLowerCase().includes(q) || 
      m.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  verifyMemory(id) {
    const memories = this._load();
    const target = memories.find(m => m.id === id);
    if (target) {
      target.verifiedByUser = true;
      target.updatedAt = new Date().toISOString();
      this._save(memories);
      return target;
    }
    return null;
  }
}

module.exports = { MemoryStore };
