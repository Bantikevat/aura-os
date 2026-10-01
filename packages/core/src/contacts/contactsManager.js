const fs = require('fs');
const path = require('path');

class ContactsManager {
  constructor(storagePath) {
    this.storagePath = storagePath || path.resolve(__dirname, '../../../../data/contacts.json');
    this.contacts = new Map();
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach(c => this.contacts.set(c.id || c.name.toLowerCase(), c));
        }
      } else {
        // Initialize with default template contacts
        this._initDefaults();
      }
    } catch (e) {
      console.warn('[CONTACTS MANAGER LOAD WARNING]:', e.message);
      this._initDefaults();
    }
  }

  _initDefaults() {
    const defaults = [
      {
        id: 'mummy',
        name: 'Mummy',
        phone: '+919876543210',
        aliases: ['mummy', 'mom', 'maa', 'माताजी', 'मम्मी', 'माँ']
      },
      {
        id: 'papa',
        name: 'Papa',
        phone: '+919876543211',
        aliases: ['papa', 'dad', 'pitaji', 'पिताजी', 'पापा']
      },
      {
        id: 'bhai',
        name: 'Bhai',
        phone: '+919876543212',
        aliases: ['bhai', 'bro', 'brother', 'भाई']
      }
    ];

    defaults.forEach(c => this.contacts.set(c.id, c));
    this._save();
  }

  _save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const list = Array.from(this.contacts.values());
      fs.writeFileSync(this.storagePath, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
      console.warn('[CONTACTS MANAGER SAVE WARNING]:', e.message);
    }
  }

  /**
   * Sanitizes a phone number into international WhatsApp format (defaults to +91 if 10 digits).
   */
  sanitizePhone(input) {
    if (!input) return null;
    const digits = input.replace(/[^0-9+]/g, '');
    if (digits.startsWith('+')) return digits;
    if (digits.length === 10) return '+91' + digits;
    if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
    return digits;
  }

  /**
   * Resolves a contact query (name, alias, or raw phone number).
   */
  resolveContact(query) {
    if (!query || typeof query !== 'string') return null;
    const clean = query.toLowerCase().trim();

    // 1. Direct phone number check
    const digitsOnly = clean.replace(/[^0-9]/g, '');
    if (digitsOnly.length >= 10) {
      return {
        name: digitsOnly,
        phone: this.sanitizePhone(clean),
        isRawNumber: true
      };
    }

    // 2. Exact match in contacts book
    if (this.contacts.has(clean)) {
      return this.contacts.get(clean);
    }

    // 3. Alias or substring match
    for (const contact of this.contacts.values()) {
      if (contact.name.toLowerCase() === clean) return contact;
      if (contact.aliases) {
        for (const alias of contact.aliases) {
          if (alias.toLowerCase() === clean || clean.includes(alias.toLowerCase())) {
            return contact;
          }
        }
      }
    }

    return null;
  }

  addContact(name, phone, aliases = []) {
    if (!name || !phone) return false;
    const id = name.toLowerCase().trim();
    const contact = {
      id,
      name: name.trim(),
      phone: this.sanitizePhone(phone),
      aliases: Array.isArray(aliases) ? aliases.map(a => a.toLowerCase().trim()) : [id]
    };
    this.contacts.set(id, contact);
    this._save();
    return contact;
  }

  listContacts() {
    return Array.from(this.contacts.values());
  }
}

const contactsManager = new ContactsManager();

module.exports = {
  ContactsManager,
  contactsManager
};
