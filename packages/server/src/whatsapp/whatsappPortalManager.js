const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { contactsManager } = require('../../../core/src/contacts/contactsManager');

class WhatsAppPortalManager {
  constructor() {
    this.authDir = path.resolve(process.cwd(), 'data', 'whatsapp_session');
    this.status = 'DISCONNECTED'; // 'DISCONNECTED' | 'INITIALIZING' | 'SCAN_QR' | 'CONNECTED'
    this.sock = null;
    this.qrDataUrl = null;
    this.userInfo = null;
    this.chats = new Map(); // jid -> { id, name, lastMessage, timestamp, messages: [] }
    this.contacts = new Map(); // cleanPhone -> { id, name, phone, notify }
    this.isStarting = false;

    // Load initial contacts
    this._loadInitialContacts();
  }

  _loadInitialContacts() {
    // 1. Load from contactsManager (data/contacts.json)
    try {
      if (contactsManager) {
        const localList = contactsManager.listContacts();
        for (const c of localList) {
          const cleanPhone = String(c.phone || '').replace(/[^0-9]/g, '');
          if (cleanPhone) {
            this.contacts.set(cleanPhone, {
              id: `${cleanPhone}@s.whatsapp.net`,
              name: c.name || cleanPhone,
              phone: `+${cleanPhone}`,
              source: 'address_book'
            });
          }
        }
      }
    } catch (e) {
      console.warn('[WA MANAGER] Error loading local contacts:', e.message);
    }

    // 2. Scan synced session files (lid-mapping-...)
    try {
      if (fs.existsSync(this.authDir)) {
        const files = fs.readdirSync(this.authDir).filter(f => f.startsWith('lid-mapping') && f.endsWith('_reverse.json'));
        for (const file of files) {
          try {
            const rawPhone = JSON.parse(fs.readFileSync(path.join(this.authDir, file), 'utf8'));
            const clean = String(rawPhone || '').replace(/[^0-9]/g, '');
            if (clean && !this.contacts.has(clean)) {
              this.contacts.set(clean, {
                id: `${clean}@s.whatsapp.net`,
                name: `+${clean}`,
                phone: `+${clean}`,
                source: 'synced_phone'
              });
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('[WA MANAGER] Error scanning session contacts:', e.message);
    }

    console.log(`[WA MANAGER] Loaded ${this.contacts.size} contacts into memory.`);
  }

  _saveContact(c) {
    if (!c || !c.id) return;
    const rawId = c.id;
    const cleanPhone = rawId.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (!cleanPhone) return;

    const name = c.name || c.notify || c.verifiedName;
    const existing = this.contacts.get(cleanPhone) || {
      id: rawId,
      phone: `+${cleanPhone}`
    };

    if (name) {
      existing.name = name;
    } else if (!existing.name) {
      existing.name = `+${cleanPhone}`;
    }
    existing.notify = c.notify || existing.notify;

    this.contacts.set(cleanPhone, existing);

    const jid = `${cleanPhone}@s.whatsapp.net`;
    if (this.chats.has(jid)) {
      const chat = this.chats.get(jid);
      if (name) chat.name = name;
    }
  }

  _saveChat(ch) {
    if (!ch || !ch.id) return;
    const jid = ch.id;
    if (jid.endsWith('@broadcast')) return;

    const cleanPhone = jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const contact = this.contacts.get(cleanPhone);
    const resolvedName = ch.name || contact?.name || (cleanPhone ? `+${cleanPhone}` : jid);

    const existing = this.chats.get(jid) || { id: jid, name: resolvedName, messages: [] };
    if (resolvedName) existing.name = resolvedName;
    if (ch.conversationTimestamp) {
      existing.timestamp = Number(ch.conversationTimestamp) * 1000;
    }
    if (ch.unreadCount !== undefined) {
      existing.unread = ch.unreadCount;
    }
    this.chats.set(jid, existing);
  }

  _saveMessage(msg) {
    if (!msg || !msg.message) return;
    const jid = msg.key.remoteJid;
    if (!jid || jid.endsWith('@broadcast')) return;

    const cleanPhone = jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const contact = this.contacts.get(cleanPhone);

    const text = msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      (msg.message.imageMessage ? '[Photo]' : '') ||
      (msg.message.videoMessage ? '[Video]' : '') ||
      (msg.message.audioMessage ? '[Voice Note]' : '') ||
      (msg.message.documentMessage ? '[Document]' : '') ||
      '[Message]';

    const pushName = msg.pushName || contact?.name || (cleanPhone ? `+${cleanPhone}` : jid);
    const timestamp = Number(msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000;
    const fromMe = Boolean(msg.key.fromMe);

    const existing = this.chats.get(jid) || { id: jid, name: pushName, messages: [] };
    if (pushName) existing.name = pushName;
    existing.lastMessage = text;
    existing.timestamp = timestamp;
    if (!existing.messages) existing.messages = [];
    existing.messages.push({
      id: msg.key.id,
      text,
      fromMe,
      timestamp
    });
    if (existing.messages.length > 50) {
      existing.messages = existing.messages.slice(-50);
    }
    this.chats.set(jid, existing);
  }

  async start() {
    if (this.sock && this.status === 'CONNECTED') {
      return this.getStatus();
    }
    if (this.isStarting) {
      return this.getStatus();
    }

    this.isStarting = true;
    this.status = 'INITIALIZING';

    try {
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      this.sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['AURA Life OS', 'Desktop Portal', '1.0.0'],
        syncFullHistory: true
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
            this.status = 'SCAN_QR';
            console.log('[WHATSAPP PORTAL] New QR Code generated for portal login');
          } catch (qrErr) {
            console.error('[WHATSAPP PORTAL] QR generation error:', qrErr);
          }
        }

        if (connection === 'open') {
          this.status = 'CONNECTED';
          this.qrDataUrl = null;
          const user = this.sock.user || {};
          const rawId = user.id || '';
          const phone = rawId.split(':')[0] || rawId.split('@')[0];
          this.userInfo = {
            id: rawId,
            phone: phone ? `+${phone}` : '',
            name: user.name || 'AURA User'
          };
          console.log(`[WHATSAPP PORTAL] Successfully connected! Logged in as: ${this.userInfo.name} (${this.userInfo.phone})`);
          // Refresh contacts scan
          this._loadInitialContacts();
        } else if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          console.log(`[WHATSAPP PORTAL] Connection closed. Status: ${statusCode}, Reconnect: ${shouldReconnect}`);
          if (shouldReconnect) {
            this.status = 'DISCONNECTED';
            this.isStarting = false;
            setTimeout(() => this.start(), 3000);
          } else {
            this.status = 'DISCONNECTED';
            this.qrDataUrl = null;
            this.userInfo = null;
            this.isStarting = false;
          }
        }
      });

      // App state sync & Contacts Sync
      this.sock.ev.on('contacts.upsert', (contacts) => {
        for (const c of contacts) {
          this._saveContact(c);
        }
      });

      this.sock.ev.on('contacts.update', (updates) => {
        for (const u of updates) {
          this._saveContact(u);
        }
      });

      this.sock.ev.on('messaging-history.set', ({ chats, contacts, messages }) => {
        if (contacts) {
          for (const c of contacts) this._saveContact(c);
        }
        if (chats) {
          for (const ch of chats) this._saveChat(ch);
        }
        if (messages) {
          for (const m of messages) this._saveMessage(m);
        }
      });

      this.sock.ev.on('chats.upsert', (chats) => {
        for (const ch of chats) this._saveChat(ch);
      });

      this.sock.ev.on('chats.update', (updates) => {
        for (const u of updates) this._saveChat(u);
      });

      this.sock.ev.on('messages.upsert', (m) => {
        const messages = m.messages || [];
        for (const msg of messages) {
          this._saveMessage(msg);
        }
      });

    } catch (err) {
      console.error('[WHATSAPP PORTAL] Initialization failed:', err);
      this.status = 'DISCONNECTED';
    } finally {
      this.isStarting = false;
    }

    return this.getStatus();
  }

  getStatus() {
    return {
      status: this.status,
      isConnected: this.status === 'CONNECTED',
      user: this.userInfo,
      qr: this.qrDataUrl,
      chats: this.getRecentChats(),
      contacts: this.getContacts().slice(0, 100),
      totalContacts: this.contacts.size
    };
  }

  getRecentChats() {
    return Array.from(this.chats.values())
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 50);
  }

  getContacts() {
    return Array.from(this.contacts.values())
      .sort((a, b) => {
        // Named contacts first, then phone
        const aHasName = a.name && !a.name.startsWith('+');
        const bHasName = b.name && !b.name.startsWith('+');
        if (aHasName && !bHasName) return -1;
        if (!aHasName && bHasName) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
  }

  async sendMessage(to, text) {
    if (this.status !== 'CONNECTED' || !this.sock) {
      throw new Error('WhatsApp is not connected. Please scan QR code in the portal first.');
    }

    let targetPhone = to;
    if (contactsManager) {
      const resolved = contactsManager.resolveContact(to);
      if (resolved && resolved.phone) {
        targetPhone = resolved.phone;
      }
    }

    let cleanDigits = String(targetPhone).replace(/[^0-9]/g, '');
    if (cleanDigits.length === 10) {
      cleanDigits = '91' + cleanDigits;
    }
    const jid = `${cleanDigits}@s.whatsapp.net`;

    const sent = await this.sock.sendMessage(jid, { text });

    const existing = this.chats.get(jid) || { id: jid, name: to, messages: [] };
    existing.lastMessage = text;
    existing.timestamp = Date.now();
    if (!existing.messages) existing.messages = [];
    existing.messages.push({
      id: sent.key.id,
      text,
      fromMe: true,
      timestamp: Date.now()
    });
    this.chats.set(jid, existing);

    return {
      success: true,
      jid,
      phone: `+${cleanDigits}`,
      messageId: sent.key.id,
      text
    };
  }

  async logout() {
    try {
      if (this.sock) {
        await this.sock.logout().catch(() => {});
        this.sock.end();
      }
    } catch (_) {}

    this.sock = null;
    this.status = 'DISCONNECTED';
    this.qrDataUrl = null;
    this.userInfo = null;
    this.chats.clear();
    this.contacts.clear();

    if (fs.existsSync(this.authDir)) {
      try {
        fs.rmSync(this.authDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Failed to clear whatsapp_session dir:', e);
      }
    }

    return { success: true, message: 'Logged out successfully' };
  }
}

const whatsappPortalManager = new WhatsAppPortalManager();

module.exports = {
  WhatsAppPortalManager,
  whatsappPortalManager
};
