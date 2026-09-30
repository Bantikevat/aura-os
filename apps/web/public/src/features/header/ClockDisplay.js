/**
 * Real Locale & Timezone Clock Component
 * Displays user's actual system date and time
 */
export function createClockDisplay() {
  const container = document.createElement('div');
  container.className = 'header-clock-display-box';
  container.title = `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;

  container.innerHTML = `
    <span class="clock-date-line" id="hdrLiveDate">---</span>
    <span class="clock-time-line" id="hdrLiveTime">--:-- --</span>
  `;

  const dateEl = container.querySelector('#hdrLiveDate');
  const timeEl = container.querySelector('#hdrLiveTime');

  function update() {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString([], {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    timeEl.textContent = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  update();
  setInterval(update, 1000);

  return container;
}
