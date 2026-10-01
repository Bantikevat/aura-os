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
    this.isStarting = false;
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
        browser: ['AURA Life OS', 'Desktop Portal', '1.0.0']
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

      this.sock.ev.on('messages.upsert', (m) => {
        const messages = m.messages || [];
        for (const msg of messages) {
          if (!msg.message) continue;
          const jid = msg.key.remoteJid;
          if (!jid || jid.endsWith('@broadcast')) continue;

          const text = msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            (msg.message.imageMessage ? '[Photo]' : '') ||
            (msg.message.videoMessage ? '[Video]' : '') ||
            '[Message]';

          const pushName = msg.pushName || jid.split('@')[0];
          const timestamp = Number(msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000;
          const fromMe = Boolean(msg.key.fromMe);

          const existing = this.chats.get(jid) || { id: jid, name: pushName, messages: [] };
          existing.name = pushName || existing.name;
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
      chats: this.getRecentChats()
    };
  }

  getRecentChats() {
    return Array.from(this.chats.values())
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 30);
  }

  async sendMessage(to, text) {
    if (this.status !== 'CONNECTED' || !this.sock) {
      throw new Error('WhatsApp is not connected. Please scan QR code in the portal first.');
    }

    let targetPhone = to;
    if (contactsManager) {
      const resolved = contactsManager.getContact(to);
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
