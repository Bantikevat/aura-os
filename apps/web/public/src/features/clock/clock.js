/**
 * AURA Clock & Time Engine
 * Updates date, time, and greeting dynamically
 */
export function initClock() {
  const liveDate = document.getElementById('liveDate');
  const liveClock = document.getElementById('liveClock');

  function update() {
    const now = new Date();
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    if (liveDate) liveDate.textContent = now.toLocaleDateString('en-US', options);

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const strHours = String(hours).padStart(2, '0');
    if (liveClock) liveClock.textContent = `${strHours}:${minutes} ${ampm}`;
  }

  update();
  setInterval(update, 1000);
}
