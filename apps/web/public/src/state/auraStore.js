/**
 * AURA Centralized State Store
 * Singleton reactive event bus holding system presence & telemetry
 */
class AuraStateStore {
  constructor() {
    this.state = {
      connectionStatus: 'Connecting', // 'Online' | 'Connecting' | 'Degraded' | 'Offline'
      currentMode: 'engineer',
      activityState: 'idle', // 'idle' | 'listening' | 'thinking' | 'speaking' | 'working' | 'watching'
      voiceState: 'idle', // 'idle' | 'listening' | 'speaking' | 'muted' | 'error'
      visionState: 'inactive', // 'inactive' | 'active_camera' | 'active_screen' | 'paused' | 'unavailable'
      activeTask: 'AURA Project Development',
      pendingApproval: null,
      notifications: [],
      unreadCount: 0,
      theme: localStorage.getItem('aura_theme') || 'dark',
      focusState: { active: false, secondsLeft: 0, mode: 'none', timerId: null },
      currentUser: {
        name: 'Banti Kevat',
        role: 'Lead AI Engineer',
        status: 'Online',
        avatar: 'aura-hero-v3.jpg'
      }
    };
    this.subscribers = new Map();
    this.initHeartbeat();
    this.fetchNotifications();
  }

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);
    callback(this.state[key], this.state);
    return () => this.subscribers.get(key).delete(callback);
  }

  setState(updates) {
    for (const [key, val] of Object.entries(updates)) {
      this.state[key] = val;
      if (this.subscribers.has(key)) {
        this.subscribers.get(key).forEach(cb => cb(val, this.state));
      }
    }
  }

  getState() {
    return this.state;
  }

  // Real Heartbeat to /api/status (never fake online)
  async initHeartbeat() {
    const check = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('/api/status', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          this.setState({ connectionStatus: 'Online' });
        } else {
          this.setState({ connectionStatus: 'Degraded' });
        }
      } catch (err) {
        this.setState({ connectionStatus: 'Offline' });
      }
    };

    check();
    setInterval(check, 10000); // Check every 10s
  }

  async fetchNotifications() {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const unread = data.notifications.filter(n => !n.read).length;
        this.setState({
          notifications: data.notifications,
          unreadCount: unread
        });
      }
    } catch {}
  }
}

export const auraStore = new AuraStateStore();
