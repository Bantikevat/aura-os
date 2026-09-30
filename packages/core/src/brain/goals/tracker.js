const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class GoalTracker {
  constructor(storagePath) {
    this.storagePath = storagePath || path.join(__dirname, '../../../../data/goals.json');
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.storagePath)) {
      fs.writeFileSync(this.storagePath, JSON.stringify([], null, 2), 'utf8');
    }
  }

  _load() {
    try {
      return JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
    } catch {
      return [];
    }
  }

  _save(goals) {
    fs.writeFileSync(this.storagePath, JSON.stringify(goals, null, 2), 'utf8');
  }

  createGoal({ title, description, category = 'personal', targetDate = null, milestones = [] }) {
    const goals = this._load();
    const newGoal = {
      id: 'goal_' + crypto.randomBytes(6).toString('hex'),
      title,
      description,
      category,
      status: 'active', // 'active' | 'in_progress' | 'completed' | 'paused'
      targetDate,
      milestones: milestones.map((m, idx) => ({
        id: idx + 1,
        title: m,
        completed: false
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    goals.push(newGoal);
    this._save(goals);
    return newGoal;
  }

  getActiveGoals() {
    return this._load().filter(g => g.status === 'active' || g.status === 'in_progress');
  }
}

module.exports = { GoalTracker };
