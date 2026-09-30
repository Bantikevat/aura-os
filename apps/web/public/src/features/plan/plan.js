/**
 * AURA Today's Plan & Task Manager
 * Features: Persistent task list in localStorage, toggling completion, real-time feedback
 */
import { voiceEngine } from '../voice/speech.js';

export function initPlan() {
  const planList = document.getElementById('planList');
  if (!planList) return;

  const defaultPlans = [
    { id: 1, time: '06:30', desc: 'Morning Brief with AURA', done: true },
    { id: 2, time: '07:00', desc: 'Study: AI Automation (1 hr)', done: true },
    { id: 3, time: '09:00', desc: 'AURA Project Development', done: false, active: true },
    { id: 4, time: '12:00', desc: 'SSC Practice (30 Q)', done: false },
    { id: 5, time: '03:00', desc: 'GitHub Review & Commit', done: false },
    { id: 6, time: '06:00', desc: 'Learning: MCP / Agents', done: false, purple: true },
    { id: 7, time: '09:00', desc: 'Daily Review with AURA', done: false, purple: true }
  ];

  let plans = JSON.parse(localStorage.getItem('aura_plans') || 'null') || defaultPlans;

  function render() {
    planList.innerHTML = '';
    plans.forEach(item => {
      const el = document.createElement('div');
      el.className = `plan-item ${item.done ? 'completed' : (item.active ? 'in-progress' : 'pending')}`;
      el.innerHTML = `
        <span class="time-tag">${item.time}</span>
        <span class="plan-desc">${item.desc}</span>
        ${item.done 
          ? '<span class="status-check">✔</span>' 
          : `<span class="status-circle ${item.active ? 'active' : (item.purple ? 'purple' : '')}"></span>`}
      `;

      el.addEventListener('click', () => {
        item.done = !item.done;
        localStorage.setItem('aura_plans', JSON.stringify(plans));
        render();
        if (item.done) {
          voiceEngine.speak(`Great work Banti! You finished: ${item.desc}`);
        }
      });

      planList.appendChild(el);
    });
  }

  render();
}
