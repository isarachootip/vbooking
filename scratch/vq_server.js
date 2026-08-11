import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { createHash, randomBytes } from 'crypto';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// PostgreSQL Connection Pool Setup
const dbConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
let dbPool = null;
let isDbConnected = false;

if (dbConnectionString || process.env.POSTGRES_HOST) {
  const dbConfig = dbConnectionString
    ? { connectionString: dbConnectionString, ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false } }
    : {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: Number(process.env.POSTGRES_PORT || 5432),
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        database: process.env.POSTGRES_DB || 'buildflowdb',
      };

  dbPool = new Pool(dbConfig);

  dbPool
    .query('SELECT NOW()')
    .then(async () => {
      isDbConnected = true;
      console.log('Γ£à Connected to PostgreSQL Database successfully');
      await initDbTables();
    })
    .catch((err) => {
      console.warn('ΓÜá∩╕Å Could not connect to PostgreSQL Database:', err.message);
      isDbConnected = false;
    });
} else {
  console.log('Γä╣∩╕Å No DATABASE_URL provided. Running server with local memory/JSON storage mode.');
}

async function initDbTables() {
  if (!dbPool) return;
  try {
    // Create users table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(100),
        password VARCHAR(255),
        line_id VARCHAR(100),
        role VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        branch_id VARCHAR(255),
        branch_name VARCHAR(255),
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create zones table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS zones (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        coverage_zipcodes JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create technicians table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS technicians (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        code VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(100),
        avatar TEXT,
        tier VARCHAR(50),
        rating NUMERIC(3,2),
        status VARCHAR(50),
        primary_zone TEXT,
        secondary_zones JSONB DEFAULT '[]'::jsonb,
        skills JSONB DEFAULT '[]'::jsonb,
        extra_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE technicians ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
    `);

    // Create standard_costs table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS standard_costs (
        id VARCHAR(255) PRIMARY KEY,
        sku VARCHAR(100) NOT NULL,
        group_name VARCHAR(255),
        product_category VARCHAR(255),
        service_type VARCHAR(255),
        product_detail TEXT,
        description TEXT NOT NULL,
        unit VARCHAR(50) DEFAULT 'EACH',
        gp_percent NUMERIC(5,2) DEFAULT 0,
        cost_standard NUMERIC(12,2) DEFAULT 0,
        cost_premium NUMERIC(12,2) DEFAULT 0,
        price_standard NUMERIC(12,2) DEFAULT 0,
        price_premium NUMERIC(12,2) DEFAULT 0,
        cost_center VARCHAR(100),
        retention VARCHAR(100),
        remark TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // vBooking API - API Clients table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS vbooking_clients (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        api_key_hash VARCHAR(255) NOT NULL,
        api_key_prefix VARCHAR(20) NOT NULL,
        rate_limit_per_min INTEGER DEFAULT 60,
        daily_quota INTEGER DEFAULT 10000,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // vBooking API - Request Logs table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS vbooking_request_logs (
        id BIGSERIAL PRIMARY KEY,
        client_id VARCHAR(50),
        client_name VARCHAR(100),
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        status_code INTEGER NOT NULL,
        response_time_ms INTEGER DEFAULT 0,
        client_ip VARCHAR(45),
        error_details TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_vbooking_logs_created ON vbooking_request_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_vbooking_logs_client ON vbooking_request_logs(client_id);
    `);

    // vBooking API - Booking Holds table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS vbooking_booking_holds (
        id VARCHAR(50) PRIMARY KEY,
        hold_token VARCHAR(100) UNIQUE NOT NULL,
        client_id VARCHAR(50),
        tech_id VARCHAR(50) NOT NULL,
        service_category VARCHAR(50),
        service_sub_category VARCHAR(50) NOT NULL,
        booking_date DATE NOT NULL,
        time_slot VARCHAR(50) NOT NULL,
        location JSONB DEFAULT '{}'::jsonb,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // vBooking API - Confirmed Bookings table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS vbooking_bookings (
        id VARCHAR(50) PRIMARY KEY,
        booking_ref VARCHAR(50) UNIQUE NOT NULL,
        hold_token VARCHAR(100),
        client_id VARCHAR(50),
        client_ref_id VARCHAR(100),
        tech_id VARCHAR(50) NOT NULL,
        tech_name VARCHAR(100),
        service_category VARCHAR(50),
        service_sub_category VARCHAR(50) NOT NULL,
        booking_date DATE NOT NULL,
        time_slot VARCHAR(50) NOT NULL,
        est_duration_hours NUMERIC(4,1),
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_email VARCHAR(100),
        location JSONB DEFAULT '{}'::jsonb,
        payment_status VARCHAR(20) DEFAULT 'PENDING',
        payment_ref VARCHAR(100),
        status VARCHAR(30) DEFAULT 'CONFIRMED',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Γ£à PostgreSQL database tables (users, zones, technicians, standard_costs, vbooking_*) verified/created');
    } catch (err) {
      console.error('Γ¥î Error initializing database tables:', err.message);
    }
  }

  // Storage Paths
  const DATA_DIR = path.join(__dirname, 'data');
  const DATA_FILE = path.join(DATA_DIR, 'line_conversations.json');
  const ZONES_FILE = path.join(DATA_DIR, 'zones.json');
  const TECHS_FILE = path.join(DATA_DIR, 'technicians.json');
  const USERS_FILE = path.join(DATA_DIR, 'users.json');
  const STANDARD_COSTS_FILE = path.join(DATA_DIR, 'standard_costs.json');
  const INTEGRATION_LOGS_FILE = path.join(DATA_DIR, 'integration_logs.json');
  const CONFIG_FILE = path.join(DATA_DIR, 'line_config.json');
  const BRANCHES_FILE = path.join(DATA_DIR, 'branches.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson(filepath, fallback) {
  try {
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error loading ${filepath}:`, err);
  }
  return fallback;
}

function saveJson(filepath, data) {
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error saving ${filepath}:`, err);
  }
}

let conversationsStore = loadJson(DATA_FILE, []);
let lineConfig = loadJson(CONFIG_FILE, {
  channelId: '',
  channelSecret: '',
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
});

// Helper to fetch user profile from LINE API
async function fetchLineUserProfile(userId, token) {
  const accessToken = token || lineConfig.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) return null;
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`[LINE PROFILE API SUCCESS]: User ${userId} -> ${data.displayName}`);
      return data;
    } else {
      const errText = await res.text();
      console.error(`[LINE PROFILE API ERROR ${res.status}]:`, errText);
    }
  } catch (err) {
    console.error('[LINE PROFILE API EXCEPTION]:', err);
  }
  return null;
}

// Background profile refetcher for conversations with placeholder names
async function tryRefetchProfiles() {
  const accessToken = lineConfig.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) return;

  let updated = false;
  for (const conv of conversationsStore) {
    if (conv.lineUserId && (conv.customerName.includes('α╕äα╕╕α╕ô LINE') || !conv.customerName)) {
      const profile = await fetchLineUserProfile(conv.lineUserId, accessToken);
      if (profile && profile.displayName) {
        conv.customerName = profile.displayName;
        if (profile.pictureUrl) conv.avatarUrl = profile.pictureUrl;
        updated = true;
      }
    }
  }
  if (updated) {
    saveJson(DATA_FILE, conversationsStore);
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Config Endpoint
app.post('/api/line/config', (req, res) => {
  const { channelId, channelSecret, channelAccessToken } = req.body;
  if (channelId) lineConfig.channelId = channelId;
  if (channelSecret) lineConfig.channelSecret = channelSecret;
  if (channelAccessToken) lineConfig.channelAccessToken = channelAccessToken;
  
  saveJson(CONFIG_FILE, lineConfig);
  tryRefetchProfiles();
  return res.json({ status: 'success', config: lineConfig });
});

app.get('/api/line/config', (req, res) => {
  return res.json({ status: 'success', config: lineConfig });
});

// 1. LINE Webhook Verification & Real-time Event Receiver
app.all('/api/line/webhook', async (req, res) => {
  console.log(`[LINE WEBHOOK] ${req.method} request received at ${new Date().toISOString()}`);

  if (req.method === 'GET') {
    return res.status(200).send('LINE Webhook Endpoint Active OK');
  }

  const events = req.body?.events || [];
  console.log(`[LINE WEBHOOK EVENTS]: Count = ${events.length}`);

  for (const event of events) {
    console.log('[LINE WEBHOOK EVENT DETAIL]:', JSON.stringify(event));

    const userId = event.source?.userId;
    if (!userId) continue;

    const timestamp = new Date(event.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let profile = await fetchLineUserProfile(userId);
    const customerName = profile?.displayName || `α╕äα╕╕α╕ô LINE (${userId.substring(0, 6)})`;
    const avatarUrl = profile?.pictureUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`;
    const lineId = `@${userId.substring(0, 8)}`;

    let conv = conversationsStore.find(c => c.lineUserId === userId || c.id === `conv-${userId}`);

    let textContent = '';
    if (event.type === 'message') {
      if (event.message?.type === 'text') {
        textContent = event.message.text;
      } else if (event.message?.type === 'image') {
        textContent = '≡ƒô╖ [α╕¬α╣êα╕çα╕úα╕╣α╕¢α╕áα╕▓α╕₧]';
      } else if (event.message?.type === 'sticker') {
        textContent = '≡ƒÿè [α╕¬α╣êα╕çα╕¬α╕òα╕┤α╣èα╕üα╣Çα╕üα╕¡α╕úα╣î]';
      } else {
        textContent = `[α╕¬α╣êα╕çα╕éα╣ëα╕¡α╕äα╕ºα╕▓α╕íα╕¢α╕úα╕░α╣Çα╕áα╕ù ${event.message?.type || 'media'}]`;
      }
    } else if (event.type === 'follow') {
      textContent = '≡ƒƒó α╣Çα╕₧α╕┤α╣êα╕íα╣Çα╕¢α╣çα╕Öα╣Çα╕₧α╕╖α╣êα╕¡α╕Öα╕üα╕▒α╕Üα╕Üα╕▒α╕ìα╕èα╕╡ LINE OA';
    } else {
      textContent = `[α╕üα╕┤α╕êα╕üα╕úα╕úα╕í ${event.type}]`;
    }

    const newMsg = {
      id: `msg-${event.message?.id || Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sender: 'customer',
      senderName: profile?.displayName || customerName,
      text: textContent,
      timestamp,
      isRead: false
    };

    if (conv) {
      if (profile?.displayName) {
        conv.customerName = profile.displayName;
      }
      if (avatarUrl) conv.avatarUrl = avatarUrl;
      conv.lastMessage = textContent;
      conv.lastMessageTime = timestamp;
      conv.unreadCount = (conv.unreadCount || 0) + 1;
      conv.messages.push(newMsg);
    } else {
      conv = {
        id: `conv-${userId}`,
        lineUserId: userId,
        customerName,
        lineId,
        avatarUrl,
        phone: '08X-XXX-XXXX',
        addressZone: 'Zone 1: α╕üα╕úα╕╕α╕çα╣Çα╕ùα╕₧α╕» (α╕¬α╕╕α╕éα╕╕α╕íα╕ºα╕┤α╕ù - α╕Üα╕▓α╕çα╕Öα╕▓)',
        lastMessage: textContent,
        lastMessageTime: timestamp,
        unreadCount: 1,
        status: 'new',
        messages: [newMsg]
      };
      conversationsStore.unshift(conv);
    }

    saveJson(DATA_FILE, conversationsStore);
  }

  // Always return 200 OK fast for LINE Platform Webhook verification
  return res.status(200).json({ status: 'ok', eventsProcessed: events.length });
});

// 2. GET API for Web App to fetch active conversations
app.get('/api/line/conversations', (req, res) => {
  tryRefetchProfiles();
  res.json({
    status: 'success',
    count: conversationsStore.length,
    conversations: conversationsStore
  });
});

// 3. POST API to send reply back to customer via LINE Push Message API
app.post('/api/line/reply', async (req, res) => {
  const { conversationId, text, channelAccessToken } = req.body;
  const token = channelAccessToken || lineConfig.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

  const conv = conversationsStore.find(c => c.id === conversationId);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const newMsg = {
    id: `cs-msg-${Date.now()}`,
    sender: 'cs_agent',
    senderName: 'α╣Çα╕êα╣ëα╕▓α╕½α╕Öα╣ëα╕▓α╕ùα╕╡α╣ê vService CS',
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isRead: true
  };

  conv.lastMessage = text;
  conv.lastMessageTime = 'α╣Çα╕íα╕╖α╣êα╕¡α╕äα╕úα╕╣α╣ê';
  conv.unreadCount = 0;
  conv.messages.push(newMsg);
  saveJson(DATA_FILE, conversationsStore);

  // Send Push Message to LINE user if token & userId exist
  if (token && conv.lineUserId) {
    try {
      const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          to: conv.lineUserId,
          messages: [{ type: 'text', text }]
        })
      });
      console.log(`[LINE PUSH RESULT]: Status ${lineRes.status}`);
    } catch (err) {
      console.error('[LINE PUSH ERROR]:', err);
    }
  }

  return res.json({ status: 'success', conversation: conv });
});

// 4. Clear conversations API
app.post('/api/line/clear', (req, res) => {
  conversationsStore = [];
  saveJson(DATA_FILE, []);
  console.log('[LINE SERVER]: Conversations cleared by admin');
  res.json({ status: 'cleared' });
});

// Health check & DB Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    dbConnected: isDbConnected,
    conversationsCount: conversationsStore.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/db/status', async (req, res) => {
  if (!isDbConnected || !dbPool) {
    return res.json({ status: 'offline', mode: 'json_file_fallback' });
  }
  try {
    const result = await dbPool.query('SELECT NOW()');
    return res.json({ status: 'connected', dbTime: result.rows[0].now });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

// ----------------------------------------------------
// ZONE API ENDPOINTS (PostgreSQL + Local File Fallback)
// ----------------------------------------------------
app.get('/api/zones', async (req, res) => {
  if (isDbConnected && dbPool) {
    try {
      const result = await dbPool.query('SELECT id, code, name, description, coverage_zipcodes as "coverageZipcodes" FROM zones ORDER BY code ASC');
      return res.json({ status: 'success', source: 'postgresql', zones: result.rows });
    } catch (err) {
      console.error('Error querying zones from PostgreSQL:', err);
    }
  }
  const fallbackZones = loadJson(ZONES_FILE, []);
  return res.json({ status: 'success', source: 'json_file', zones: fallbackZones });
});

// ----------------------------------------------------
// BRANCH API ENDPOINTS
// ----------------------------------------------------
app.get('/api/branches', async (req, res) => {
  const branches = loadJson(BRANCHES_FILE, []);
  return res.json({ status: 'success', source: 'json_file', branches });
});

app.post('/api/zones/bulk', async (req, res) => {
  const { zones } = req.body;
  if (!Array.isArray(zones)) {
    return res.status(400).json({ error: 'zones must be an array' });
  }

  let dbSavedCount = 0;
  if (isDbConnected && dbPool) {
    try {
      for (const zone of zones) {
        await dbPool.query(
          `INSERT INTO zones (id, code, name, description, coverage_zipcodes, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (id) DO UPDATE 
           SET code = EXCLUDED.code, name = EXCLUDED.name, description = EXCLUDED.description, coverage_zipcodes = EXCLUDED.coverage_zipcodes, updated_at = NOW()`,
          [
            zone.id || `zone-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            zone.code,
            zone.name,
            zone.description || '',
            JSON.stringify(zone.coverageZipcodes || [])
          ]
        );
        dbSavedCount++;
      }
    } catch (err) {
      console.error('Error saving zones to PostgreSQL:', err);
    }
  }

  // Backup to JSON file as fallback
  saveJson(ZONES_FILE, zones);

  return res.json({
    status: 'success',
    savedCount: zones.length,
    dbSavedCount,
    source: isDbConnected ? 'postgresql' : 'json_file'
  });
});

app.delete('/api/zones/:id', async (req, res) => {
  const { id } = req.params;
  if (isDbConnected && dbPool) {
    try {
      await dbPool.query('DELETE FROM zones WHERE id = $1', [id]);
    } catch (err) {
      console.error('Error deleting zone from PostgreSQL:', err);
    }
  }
  const currentZones = loadJson(ZONES_FILE, []);
  const filtered = currentZones.filter(z => z.id !== id);
  saveJson(ZONES_FILE, filtered);

  return res.json({ status: 'success', deletedId: id });
});

// ----------------------------------------------------
// TECHNICIAN API ENDPOINTS (PostgreSQL + Local File Fallback)
// ----------------------------------------------------
app.get('/api/technicians', async (req, res) => {
  if (isDbConnected && dbPool) {
    try {
      const result = await dbPool.query('SELECT id, code, name, phone, avatar, tier, rating, status, primary_zone as "primaryZone", secondary_zones as "secondaryZones", skills, extra_data FROM technicians ORDER BY code ASC');
      const techs = result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        phone: row.phone,
        avatar: row.avatar,
        tier: row.tier,
        rating: Number(row.rating || 4.5),
        status: row.status,
        primaryZone: row.primaryZone,
        secondaryZones: row.secondaryZones || [],
        skills: row.skills || [],
        ...(row.extra_data || {})
      }));
      return res.json({ status: 'success', source: 'postgresql', technicians: techs });
    } catch (err) {
      console.error('Error querying technicians from PostgreSQL:', err);
    }
  }
  const fallbackTechs = loadJson(TECHS_FILE, []);
  return res.json({ status: 'success', source: 'json_file', technicians: fallbackTechs });
});

app.post('/api/technicians/bulk', async (req, res) => {
  const { technicians } = req.body;
  if (!Array.isArray(technicians)) {
    return res.status(400).json({ error: 'technicians must be an array' });
  }

  let dbSavedCount = 0;
  if (isDbConnected && dbPool) {
    try {
      for (const tech of technicians) {
        const { id, code, name, phone, avatar, tier, rating, status, primaryZone, secondaryZones, skills, ...extraData } = tech;
        await dbPool.query(
          `INSERT INTO technicians (id, code, name, phone, avatar, tier, rating, status, primary_zone, secondary_zones, skills, extra_data, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
           ON CONFLICT (id) DO UPDATE 
           SET code = EXCLUDED.code, name = EXCLUDED.name, phone = EXCLUDED.phone, avatar = EXCLUDED.avatar,
               tier = EXCLUDED.tier, rating = EXCLUDED.rating, status = EXCLUDED.status, primary_zone = EXCLUDED.primary_zone,
               secondary_zones = EXCLUDED.secondary_zones, skills = EXCLUDED.skills, extra_data = EXCLUDED.extra_data, updated_at = NOW()`,
          [
            id || `tech-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            code || 'T-999',
            name || 'Unassigned Tech',
            phone || '',
            avatar || '',
            tier || 'Silver',
            rating || 4.5,
            status || 'Available',
            primaryZone || '',
            JSON.stringify(secondaryZones || []),
            JSON.stringify(skills || []),
            JSON.stringify(extraData || {})
          ]
        );
        dbSavedCount++;
      }
    } catch (err) {
      console.error('Error saving technicians to PostgreSQL:', err);
    }
  }

  // Backup to JSON file as fallback
  saveJson(TECHS_FILE, technicians);

  return res.json({
    status: 'success',
    savedCount: technicians.length,
    dbSavedCount,
    source: isDbConnected ? 'postgresql' : 'json_file'
  });
});

app.delete('/api/technicians/:id', async (req, res) => {
  const { id } = req.params;
  if (isDbConnected && dbPool) {
    try {
      await dbPool.query('DELETE FROM technicians WHERE id = $1', [id]);
    } catch (err) {
      console.error('Error deleting technician from PostgreSQL:', err);
    }
  }
  const currentTechs = loadJson(TECHS_FILE, []);
  const filtered = currentTechs.filter(t => t.id !== id);
  saveJson(TECHS_FILE, filtered);

  return res.json({ status: 'success', deletedId: id });
});

// ----------------------------------------------------
// USER API ENDPOINTS (PostgreSQL + Local File Fallback)
// ----------------------------------------------------
app.get('/api/users', async (req, res) => {
  if (isDbConnected && dbPool) {
    try {
      const result = await dbPool.query('SELECT id, username, name, email, phone, password, line_id as "lineId", role, status, branch_id as "branchId", branch_name as "branchName", avatar_url as "avatarUrl", created_at as "createdAt" FROM users ORDER BY created_at ASC');
      return res.json({ status: 'success', source: 'postgresql', users: result.rows });
    } catch (err) {
      console.error('Error querying users from PostgreSQL:', err);
    }
  }
  const fallbackUsers = loadJson(USERS_FILE, []);
  const uniqueUsers = [];
  const seenIds = new Set();
  for (const u of fallbackUsers) {
    if (u.id && !seenIds.has(u.id)) {
      seenIds.add(u.id);
      uniqueUsers.push(u);
    }
  }
  return res.json({ status: 'success', source: 'json_file', users: uniqueUsers });
});

app.post('/api/users', async (req, res) => {
  const u = req.body;
  if (!u || (!u.username && !u.id)) {
    return res.status(400).json({ error: 'user payload invalid' });
  }

  const userId = u.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const userObj = { ...u, id: userId };

  if (isDbConnected && dbPool) {
    try {
      const existing = await dbPool.query('SELECT id FROM users WHERE id = $1 OR username = $2', [userId, u.username]);
      if (existing.rows.length > 0) {
        const targetId = existing.rows[0].id;
        await dbPool.query(
          `UPDATE users 
           SET username = $1, name = $2, email = $3, phone = $4, password = $5, line_id = $6,
               role = $7, status = $8, branch_id = $9, branch_name = $10, avatar_url = $11, updated_at = NOW()
           WHERE id = $12`,
          [
            userObj.username,
            userObj.name,
            userObj.email || '',
            userObj.phone || '',
            userObj.password || 'Pass1234',
            userObj.lineId || '',
            userObj.role || 'technician',
            userObj.status || 'Active',
            userObj.branchId || null,
            userObj.branchName || null,
            userObj.avatarUrl || null,
            targetId
          ]
        );
      } else {
        await dbPool.query(
          `INSERT INTO users (id, username, name, email, phone, password, line_id, role, status, branch_id, branch_name, avatar_url, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
          [
            userId,
            userObj.username,
            userObj.name,
            userObj.email || '',
            userObj.phone || '',
            userObj.password || 'Pass1234',
            userObj.lineId || '',
            userObj.role || 'technician',
            userObj.status || 'Active',
            userObj.branchId || null,
            userObj.branchName || null,
            userObj.avatarUrl || null
          ]
        );
      }
    } catch (err) {
      console.error('Error saving single user to PostgreSQL:', err);
    }
  }

  const currentUsers = loadJson(USERS_FILE, []);
  const idx = currentUsers.findIndex(item => item.id === userId || item.username === userObj.username);
  if (idx >= 0) {
    currentUsers[idx] = userObj;
  } else {
    currentUsers.unshift(userObj);
  }
  saveJson(USERS_FILE, currentUsers);

  return res.json({ status: 'success', user: userObj });
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  const userObj = { ...u, id };

  if (isDbConnected && dbPool) {
    try {
      const existing = await dbPool.query('SELECT id FROM users WHERE id = $1 OR username = $2', [id, u.username]);
      if (existing.rows.length > 0) {
        const targetId = existing.rows[0].id;
        await dbPool.query(
          `UPDATE users 
           SET username = $1, name = $2, email = $3, phone = $4, password = $5, line_id = $6,
               role = $7, status = $8, branch_id = $9, branch_name = $10, avatar_url = $11, updated_at = NOW()
           WHERE id = $12`,
          [
            userObj.username,
            userObj.name,
            userObj.email || '',
            userObj.phone || '',
            userObj.password || 'Pass1234',
            userObj.lineId || '',
            userObj.role || 'technician',
            userObj.status || 'Active',
            userObj.branchId || null,
            userObj.branchName || null,
            userObj.avatarUrl || null,
            targetId
          ]
        );
      } else {
        await dbPool.query(
          `INSERT INTO users (id, username, name, email, phone, password, line_id, role, status, branch_id, branch_name, avatar_url, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
          [
            id,
            userObj.username,
            userObj.name,
            userObj.email || '',
            userObj.phone || '',
            userObj.password || 'Pass1234',
            userObj.lineId || '',
            userObj.role || 'technician',
            userObj.status || 'Active',
            userObj.branchId || null,
            userObj.branchName || null,
            userObj.avatarUrl || null
          ]
        );
      }
    } catch (err) {
      console.error('Error updating user in PostgreSQL:', err);
    }
  }

  const currentUsers = loadJson(USERS_FILE, []);
  const idx = currentUsers.findIndex(item => item.id === id || item.username === userObj.username);
  if (idx >= 0) {
    currentUsers[idx] = userObj;
  } else {
    currentUsers.unshift(userObj);
  }
  saveJson(USERS_FILE, currentUsers);

  return res.json({ status: 'success', user: userObj });
});

app.post('/api/users/bulk', async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) {
    return res.status(400).json({ error: 'users must be an array' });
  }

  let dbSavedCount = 0;
  if (isDbConnected && dbPool) {
    try {
      for (const u of users) {
        await dbPool.query(
          `INSERT INTO users (id, username, name, email, phone, password, line_id, role, status, branch_id, branch_name, avatar_url, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
           ON CONFLICT (id) DO UPDATE 
           SET username = EXCLUDED.username, name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone,
               password = EXCLUDED.password, line_id = EXCLUDED.line_id, role = EXCLUDED.role, status = EXCLUDED.status,
               branch_id = EXCLUDED.branch_id, branch_name = EXCLUDED.branch_name, avatar_url = EXCLUDED.avatar_url, updated_at = NOW()`,
          [
            u.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            u.username,
            u.name,
            u.email || '',
            u.phone || '',
            u.password || 'Pass1234',
            u.lineId || '',
            u.role || 'technician',
            u.status || 'Active',
            u.branchId || null,
            u.branchName || null,
            u.avatarUrl || null
          ]
        );
        dbSavedCount++;
      }
    } catch (err) {
      console.error('Error saving users to PostgreSQL:', err);
    }
  }

  // Backup to JSON file as fallback
  saveJson(USERS_FILE, users);

  return res.json({
    status: 'success',
    savedCount: users.length,
    dbSavedCount,
    source: isDbConnected ? 'postgresql' : 'json_file'
  });
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  if (isDbConnected && dbPool) {
    try {
      await dbPool.query('DELETE FROM users WHERE id = $1', [id]);
    } catch (err) {
      console.error('Error deleting user from PostgreSQL:', err);
    }
  }
  const currentUsers = loadJson(USERS_FILE, []);
  const filtered = currentUsers.filter(u => u.id !== id);
  saveJson(USERS_FILE, filtered);

  return res.json({ status: 'success', deletedId: id });
});

// ----------------------------------------------------
// STANDARD COSTS MASTER API ENDPOINTS
// ----------------------------------------------------
app.get('/api/standard-costs', async (req, res) => {
  if (isDbConnected && dbPool) {
    try {
      const result = await dbPool.query(`
        SELECT id, sku, group_name as "group", product_category as "productCategory", service_type as "serviceType",
               product_detail as "productDetail", description, unit, gp_percent as "gpPercent",
               cost_standard as "costStandard", cost_premium as "costPremium", price_standard as "priceStandard",
               price_premium as "pricePremium", cost_center as "costCenter", retention, remark,
               created_at as "createdAt", updated_at as "updatedAt"
        FROM standard_costs ORDER BY created_at ASC
      `);
      const formatted = result.rows.map(row => ({
        ...row,
        gpPercent: Number(row.gpPercent || 0),
        costStandard: Number(row.costStandard || 0),
        costPremium: Number(row.costPremium || 0),
        priceStandard: Number(row.priceStandard || 0),
        pricePremium: Number(row.pricePremium || 0)
      }));
      return res.json({ status: 'success', source: 'postgresql', standardCosts: formatted });
    } catch (err) {
      console.error('Error querying standard costs from PostgreSQL:', err);
    }
  }
  const fallbackCosts = loadJson(STANDARD_COSTS_FILE, []);
  return res.json({ status: 'success', source: 'json_file', standardCosts: fallbackCosts });
});

app.post('/api/standard-costs/bulk', async (req, res) => {
  const { standardCosts } = req.body;
  if (!Array.isArray(standardCosts)) {
    return res.status(400).json({ error: 'standardCosts must be an array' });
  }

  let dbSavedCount = 0;
  if (isDbConnected && dbPool) {
    try {
      for (const item of standardCosts) {
        await dbPool.query(
          `INSERT INTO standard_costs (id, sku, group_name, product_category, service_type, product_detail, description, unit, gp_percent, cost_standard, cost_premium, price_standard, price_premium, cost_center, retention, remark, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
           ON CONFLICT (id) DO UPDATE 
           SET sku = EXCLUDED.sku, group_name = EXCLUDED.group_name, product_category = EXCLUDED.product_category,
               service_type = EXCLUDED.service_type, product_detail = EXCLUDED.product_detail, description = EXCLUDED.description,
               unit = EXCLUDED.unit, gp_percent = EXCLUDED.gp_percent, cost_standard = EXCLUDED.cost_standard,
               cost_premium = EXCLUDED.cost_premium, price_standard = EXCLUDED.price_standard, price_premium = EXCLUDED.price_premium,
               cost_center = EXCLUDED.cost_center, retention = EXCLUDED.retention, remark = EXCLUDED.remark, updated_at = NOW()`,
          [
            item.id || `std-cost-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            item.sku || 'SKU-STD-000',
            item.group || '',
            item.productCategory || '',
            item.serviceType || '',
            item.productDetail || '',
            item.description || '',
            item.unit || 'EACH',
            item.gpPercent || 0,
            item.costStandard || 0,
            item.costPremium || 0,
            item.priceStandard || 0,
            item.pricePremium || 0,
            item.costCenter || '21713',
            item.retention || '',
            item.remark || ''
          ]
        );
        dbSavedCount++;
      }
    } catch (err) {
      console.error('Error saving standard costs to PostgreSQL:', err);
    }
  }

  saveJson(STANDARD_COSTS_FILE, standardCosts);

  return res.json({
    status: 'success',
    savedCount: standardCosts.length,
    dbSavedCount,
    source: isDbConnected ? 'postgresql' : 'json_file'
  });
});

app.delete('/api/standard-costs/:id', async (req, res) => {
  const { id } = req.params;
  if (isDbConnected && dbPool) {
    try {
      await dbPool.query('DELETE FROM standard_costs WHERE id = $1', [id]);
    } catch (err) {
      console.error('Error deleting standard cost item from PostgreSQL:', err);
    }
  }
  const currentItems = loadJson(STANDARD_COSTS_FILE, []);
  const filtered = currentItems.filter(item => item.id !== id);
  saveJson(STANDARD_COSTS_FILE, filtered);

  return res.json({ status: 'success', deletedId: id });
});

// Leads API Endpoints
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

app.post('/api/leads', async (req, res) => {
  const leadData = req.body || {};
  const newLead = {
    id: leadData.id || `lead_${Date.now()}`,
    customer_name: leadData.customer_name || 'Customer',
    customer_phone: leadData.customer_phone || '',
    customer_address: leadData.customer_address || '',
    customer_latitude: leadData.customer_latitude || null,
    customer_longitude: leadData.customer_longitude || null,
    map_url: leadData.map_url || '',
    job_type: leadData.job_type || 'General Service',
    notes: leadData.notes || '',
    status: 'New',
    created_at: new Date().toISOString()
  };

  if (isDbConnected && dbPool) {
    try {
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id VARCHAR(255) PRIMARY KEY,
          customer_name VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(100),
          customer_address TEXT,
          customer_latitude NUMERIC,
          customer_longitude NUMERIC,
          map_url TEXT,
          job_type VARCHAR(255),
          notes TEXT,
          status VARCHAR(50) DEFAULT 'New',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await dbPool.query(
        `INSERT INTO leads (id, customer_name, customer_phone, customer_address, customer_latitude, customer_longitude, map_url, job_type, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [newLead.id, newLead.customer_name, newLead.customer_phone, newLead.customer_address, newLead.customer_latitude, newLead.customer_longitude, newLead.map_url, newLead.job_type, newLead.notes, newLead.status]
      );
    } catch (err) {
      console.error('Error inserting lead to DB:', err);
    }
  }

  const currentLeads = loadJson(LEADS_FILE, []);
  saveJson(LEADS_FILE, [newLead, ...currentLeads]);

  return res.json({ status: 'success', message: 'Lead added successfully', lead: newLead });
});

app.get('/api/leads', async (req, res) => {
  let leads = [];
  if (isDbConnected && dbPool) {
    try {
      const result = await dbPool.query('SELECT * FROM leads ORDER BY created_at DESC');
      leads = result.rows;
    } catch (err) {
      console.error('Error fetching leads from DB:', err);
    }
  }
  if (leads.length === 0) {
    leads = loadJson(LEADS_FILE, []);
  }
  return res.json({ status: 'success', count: leads.length, leads });
});

// Projects API Endpoint
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

app.post('/api/projects', async (req, res) => {
  const p = req.body || {};
  const newProj = {
    id: p.id || `P${new Date().toISOString().slice(2,10).replace(/-/g,'')}-001`,
    name: p.name || 'New Project',
    description: p.description || '',
    status: p.status || 'In Progress',
    startDate: p.startDate || new Date().toISOString().slice(0,10),
    endDate: p.endDate || null,
    budget: p.budget || 0,
    address: p.address || '',
    created_at: new Date().toISOString()
  };

  const currentProjects = loadJson(PROJECTS_FILE, []);
  saveJson(PROJECTS_FILE, [newProj, ...currentProjects]);

  return res.json({ status: 'success', message: 'Project created successfully', project: newProj });
});

// Tasks API Endpoint
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

app.post('/api/tasks', async (req, res) => {
  const t = req.body || {};
  const newTask = {
    id: t.id || `task_${Date.now()}`,
    projectId: t.projectId || 'P1',
    title: t.title || 'New Task',
    description: t.description || '',
    status: t.status || 'To Do',
    priority: t.priority || 'Medium',
    estimatedHours: t.estimatedHours || 0,
    created_at: new Date().toISOString()
  };

  const currentTasks = loadJson(TASKS_FILE, []);
  saveJson(TASKS_FILE, [newTask, ...currentTasks]);

  return res.json({ status: 'success', message: 'Task created successfully', task: newTask });
});

// BuildFlow Production Dispatch Endpoint & Relay Proxy
app.post(['/api/buildflow/dispatch', '/api/v1/projects', '/api/leads'], async (req, res) => {
  const payload = req.body || {};
  console.log('≡ƒÜÇ [BuildFlow Dispatch Request Received on Coolify]:', payload);

  const targetUrl = process.env.BUILDFLOW_API_URL || 'https://buildflowx.online/api/leads';
  let externalStatus = 'skipped';
  let externalResponse = null;

  // Build standard BuildFlow Lead Payload format
  const custName = payload.customerName || payload.customer_name || 'α╕Ñα╕╣α╕üα╕äα╣ëα╕▓α╣âα╕½α╕íα╣ê (VQ)';
  const custPhone = payload.customerPhone || payload.customer_phone || '';
  const custAddress = payload.customerAddress || payload.customer_address || payload.addressZone || '';
  const lat = payload.latitude || payload.customer_latitude || null;
  const lng = payload.longitude || payload.customer_longitude || null;
  const mapUrl = payload.map_url || (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null);
  const jobType = payload.installationTypeName || payload.job_type || 'Quick Service';
  const notesStr = `[Ticket: ${payload.ticketNo || payload.bookingRef || '-'}] [Zone: ${payload.addressZone || '-'}] ${payload.assignedTechTeamName ? `[Tech: ${payload.assignedTechTeamName}]` : ''}`;

  const buildFlowLeadPayload = {
    customer_name: custName,
    customer_phone: custPhone,
    customer_address: custAddress,
    customer_latitude: lat ? Number(lat) : null,
    customer_longitude: lng ? Number(lng) : null,
    map_url: mapUrl,
    job_type: jobType,
    status: 'New',
    notes: notesStr
  };

  try {
    // Relay request server-to-server to BuildFlow API endpoint (bypasses browser CORS)
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-User-Id': 'admin'
      },
      body: JSON.stringify(buildFlowLeadPayload)
    });

    externalStatus = response.status === 200 || response.status === 201 ? 'success' : 'forwarded';
    try {
      externalResponse = await response.json();
    } catch (_) {
      externalResponse = await response.text();
    }
  } catch (err) {
    console.warn('ΓÜá∩╕Å BuildFlow external relay notice:', err.message);
    externalStatus = 'relay_notice';
  }

  // Save to JSON File Fallback
  const currentLogs = loadJson(INTEGRATION_LOGS_FILE, []);
  const newLogEntry = {
    id: Date.now(),
    source_system: payload.sourceSystem || 'Installer Management (VQ)',
    target_system: 'BuildFlow Leads',
    action: 'DISPATCH_PROJECT',
    payload: buildFlowLeadPayload,
    created_at: new Date().toISOString()
  };
  saveJson(INTEGRATION_LOGS_FILE, [newLogEntry, ...currentLogs].slice(0, 100));

  // Save directly to PostgreSQL (buildflowdb) if connected
  if (isDbConnected && dbPool) {
    try {
      // 1. Audit log table
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS integration_logs (
          id SERIAL PRIMARY KEY,
          source_system VARCHAR(100),
          target_system VARCHAR(100),
          action VARCHAR(255),
          payload JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await dbPool.query(
        `INSERT INTO integration_logs (source_system, target_system, action, payload) VALUES ($1, $2, $3, $4)`,
        [
          payload.sourceSystem || 'Installer Management (VQ)',
          'BuildFlow Leads',
          'DISPATCH_PROJECT',
          JSON.stringify(buildFlowLeadPayload)
        ]
      );

      // 2. Direct insert into BuildFlow leads table in buildflowdb
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id SERIAL PRIMARY KEY,
          customer_name VARCHAR(255),
          customer_phone VARCHAR(50),
          customer_address TEXT,
          customer_latitude NUMERIC,
          customer_longitude NUMERIC,
          map_url TEXT,
          job_type VARCHAR(255),
          status VARCHAR(50) DEFAULT 'New',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await dbPool.query(`
        INSERT INTO leads (customer_name, customer_phone, customer_address, customer_latitude, customer_longitude, map_url, job_type, status, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [custName, custPhone, custAddress, lat, lng, mapUrl, jobType, 'New', notesStr]);

      console.log('Γ£à Lead record inserted directly into PostgreSQL buildflowdb leads table!');
    } catch (dbErr) {
      console.error('Notice inserting lead directly to DB:', dbErr.message);
    }
  }

  return res.json({
    status: 'success',
    message: 'Dispatched to BuildFlow successfully on Coolify Production',
    targetUrl,
    externalStatus,
    externalResponse,
    dispatchedAt: new Date().toISOString()
  });
});

// GET Integration Logs (from PostgreSQL or JSON file fallback)
app.get('/api/integration-logs', async (req, res) => {
  let logs = [];
  let source = 'json_file';

  if (isDbConnected && dbPool) {
    try {
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS integration_logs (
          id SERIAL PRIMARY KEY,
          source_system VARCHAR(100),
          target_system VARCHAR(100),
          action VARCHAR(255),
          payload JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      const result = await dbPool.query('SELECT * FROM integration_logs ORDER BY created_at DESC LIMIT 100');
      logs = result.rows;
      source = 'postgresql';
    } catch (err) {
      console.error('Error fetching integration logs from PostgreSQL:', err);
    }
  }

  if (logs.length === 0) {
    logs = loadJson(INTEGRATION_LOGS_FILE, []);
  }

  return res.json({
    status: 'success',
    count: logs.length,
    source,
    logs
  });
});

// DELETE Integration Logs
app.delete('/api/integration-logs', async (req, res) => {
  if (isDbConnected && dbPool) {
    try {
      await dbPool.query('TRUNCATE TABLE integration_logs');
    } catch (err) {
      console.error('Error clearing integration_logs in PostgreSQL:', err);
    }
  }
  saveJson(INTEGRATION_LOGS_FILE, []);
  return res.json({ status: 'success', message: 'Cleared all integration logs' });
});



// ============================================================
// vBOOKING API v1 ΓÇö External Partner API for Technician Booking
// ============================================================

// ΓöÇΓöÇ In-Memory stores (fallback when DB not connected) ΓöÇΓöÇ
const vbookingClientsStore = loadJson(path.join(DATA_DIR, 'vbooking_clients.json'), []);
const vbookingHoldsMap = new Map();
const vbookingBookingsStore = loadJson(path.join(DATA_DIR, 'vbooking_bookings.json'), []);
const vbookingLogsStore = [];
const rateLimitCounters = new Map();

// ΓöÇΓöÇ Crypto helpers ΓöÇΓöÇ
// crypto imported at top of file

function hashApiKey(key) { return createHash('sha256').update(key).digest('hex'); }
function generateApiKey(clientId) { return `vbk_${clientId.slice(-8)}_${randomBytes(20).toString('hex')}`; }
function genId(prefix) { return `${prefix}_${Date.now()}_${randomBytes(3).toString('hex')}`; }

// ΓöÇΓöÇ Async log helper ΓöÇΓöÇ
async function logVbReq({ client_id, client_name, endpoint, method, status_code, response_time_ms, client_ip, error_details }) {
  const entry = { client_id, client_name, endpoint, method, status_code, response_time_ms: Math.round(response_time_ms || 0), client_ip, error_details, created_at: new Date().toISOString() };
  vbookingLogsStore.unshift(entry);
  if (vbookingLogsStore.length > 2000) vbookingLogsStore.pop();
  if (isDbConnected && dbPool) {
    try { await dbPool.query('INSERT INTO vbooking_request_logs (client_id,client_name,endpoint,method,status_code,response_time_ms,client_ip,error_details) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [client_id||null, client_name||null, endpoint, method, status_code, Math.round(response_time_ms||0), client_ip, error_details||null]); } catch {}
  }
}

// ΓöÇΓöÇ Auth + Rate Limit Middleware ΓöÇΓöÇ
async function vbAuth(req, res, next) {
  const t0 = Date.now();
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (!apiKey) {
    await logVbReq({ endpoint: req.path, method: req.method, status_code: 401, response_time_ms: Date.now()-t0, client_ip: req.ip, error_details: 'Missing X-API-Key' });
    return res.status(401).json({ status:'error', code:'MISSING_API_KEY', message:'α╕üα╕úα╕╕α╕ôα╕▓α╣âα╕¬α╣ê X-API-Key α╣âα╕Ö HTTP Header' });
  }
  const keyHash = hashApiKey(apiKey);
  let client = null;
  if (isDbConnected && dbPool) {
    try { const r = await dbPool.query('SELECT * FROM vbooking_clients WHERE api_key_hash=$1 AND status=$2',[keyHash,'ACTIVE']); if(r.rows.length) client=r.rows[0]; } catch {}
  }
  if (!client) client = vbookingClientsStore.find(c => c.api_key_hash === keyHash && c.status === 'ACTIVE');
  if (!client) {
    await logVbReq({ endpoint: req.path, method: req.method, status_code: 401, response_time_ms: Date.now()-t0, client_ip: req.ip, error_details: 'Invalid API Key' });
    return res.status(401).json({ status:'error', code:'INVALID_API_KEY', message:'API Key α╣äα╕íα╣êα╕ûα╕╣α╕üα╕òα╣ëα╕¡α╕çα╕½α╕úα╕╖α╕¡α╕ûα╕╣α╕üα╕úα╕░α╕çα╕▒α╕Üα╕üα╕▓α╕úα╣âα╕èα╣ëα╕çα╕▓α╕Ö' });
  }
  // Rate limit
  const now = Date.now(), winMs = 60000;
  let ctr = rateLimitCounters.get(client.id);
  if (!ctr || now - ctr.w > winMs) { ctr = { count: 0, w: now }; rateLimitCounters.set(client.id, ctr); }
  ctr.count++;
  if (ctr.count > (client.rate_limit_per_min || 60)) {
    await logVbReq({ client_id: client.id, client_name: client.name, endpoint: req.path, method: req.method, status_code: 429, response_time_ms: Date.now()-t0, client_ip: req.ip, error_details: 'Rate limit exceeded' });
    return res.status(429).json({ status:'error', code:'RATE_LIMIT_EXCEEDED', message:`α╣Çα╕üα╕┤α╕Ö ${client.rate_limit_per_min||60} req/min`, retry_after_seconds: Math.ceil((winMs-(now-ctr.w))/1000) });
  }
  req.vbClient = client; req.vbT0 = t0;
  res.on('finish', () => logVbReq({ client_id: client.id, client_name: client.name, endpoint: req.path, method: req.method, status_code: res.statusCode, response_time_ms: Date.now()-t0, client_ip: req.ip }));
  next();
}

// ΓöÇΓöÇ Admin Auth ΓöÇΓöÇ
function vbAdmin(req, res, next) {
  if (req.headers['x-admin-key'] !== (process.env.VBOOKING_ADMIN_KEY || 'vbk_admin_2026')) return res.status(403).json({ status:'error', code:'FORBIDDEN', message:'α╕òα╣ëα╕¡α╕çα╕üα╕▓α╕ú X-Admin-Key α╕ùα╕╡α╣êα╕ûα╕╣α╕üα╕òα╣ëα╕¡α╕ç' });
  next();
}

// ΓöÇΓöÇ Load helpers ΓöÇΓöÇ
async function vbLoadTechs() {
  if (isDbConnected && dbPool) { try { const r = await dbPool.query('SELECT id,code,name,phone,avatar,tier,rating,status,primary_zone as "primaryZone",secondary_zones as "secondaryZones",skills,extra_data FROM technicians ORDER BY rating DESC'); return r.rows.map(row => ({...row,...(row.extra_data||{}),secondaryZones:row.secondaryZones||[],skills:row.skills||[]})); } catch {} }
  return loadJson(TECHS_FILE, []);
}
async function vbLoadZones() {
  if (isDbConnected && dbPool) { try { const r = await dbPool.query('SELECT id,code,name,coverage_zipcodes as "coverageZipcodes" FROM zones'); return r.rows; } catch {} }
  return loadJson(ZONES_FILE, []);
}
function vbLoadCatalog() { return loadJson(path.join(DATA_DIR, 'vbooking_service_catalog.json'), []); }

function haversineKm(lat1,lng1,lat2,lng2) {
  if(!lat1||!lng1||!lat2||!lng2) return null;
  const R=6371, d2r=Math.PI/180, dLat=(lat2-lat1)*d2r, dLng=(lng2-lng1)*d2r;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLng/2)**2;
  return +(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))).toFixed(1);
}

function computeSlots(tech, durHrs) {
  if(tech.status==='In Cooldown'||tech.status==='Offline') return [];
  const all=[{s:'08:00',e:'12:00',h:4},{s:'13:00',e:'17:00',h:4},{s:'08:00',e:'17:00',h:9}];
  return all.filter(sl=>sl.h>=durHrs).map(sl=>`${sl.s}-${sl.e}`);
}

// ΓöÇΓöÇ SERVICE CATALOG ΓöÇΓöÇ
app.get('/api/vbooking/service-catalog', (req, res) => {
  const cat = vbLoadCatalog();
  const { category } = req.query;
  return res.json({ status:'success', catalog: category ? cat.filter(c=>c.code===category) : cat });
});

// ΓöÇΓöÇ TECHNICIAN SEARCH ΓöÇΓöÇ
app.get('/api/vbooking/technicians/search', vbAuth, async (req, res) => {
  const { service_category, service_sub_category, booking_date, postal_code, lat, lng, max_results=5, sort_by='match_score', preferred_tech_id } = req.query;
  if (!booking_date) return res.status(400).json({ status:'error', code:'MISSING_PARAMS', message:'α╕òα╣ëα╕¡α╕çα╕úα╕░α╕Üα╕╕ booking_date (YYYY-MM-DD)' });
  if (!service_sub_category && !service_category) return res.status(400).json({ status:'error', code:'MISSING_PARAMS', message:'α╕òα╣ëα╕¡α╕çα╕úα╕░α╕Üα╕╕ service_category α╕½α╕úα╕╖α╕¡ service_sub_category' });

  const catalog = vbLoadCatalog();
  let svcMeta = null;
  for (const cat of catalog) {
    if (service_sub_category) { const s=cat.sub_categories?.find(x=>x.code===service_sub_category); if(s){svcMeta={...s,category_code:cat.code,category_name:cat.name};break;} }
    else if (cat.code===service_category) { svcMeta={code:service_category,name:cat.name,est_duration_hours:3,required_skill_level:1,category_code:service_category};break; }
  }
  const durHrs = svcMeta?.est_duration_hours||3, reqSkill=svcMeta?.required_skill_level||1;

  const [techs, zones] = await Promise.all([vbLoadTechs(), vbLoadZones()]);
  let zoneId=null;
  if(postal_code) { const z=zones.find(z=>(z.coverageZipcodes||[]).includes(String(postal_code))); if(z) zoneId=z.id; }

  const scored = techs
    .filter(t=>t.status==='Available'||t.status==='On Job')
    .map(t=>{
      let score=40;
      const hasSkill=(t.skills||[]).some(s=>(s.category===service_category)&&(s.level||1)>=reqSkill);
      if(hasSkill) score+=25; else if((t.skills||[]).length>0) score+=5;
      if(zoneId){ if((t.primaryZone||'').includes(zoneId)) score+=20; else if((t.secondaryZones||[]).some(z=>z.includes(zoneId))) score+=10; }
      if(t.tier==='Gold') score+=10; else if(t.tier==='Silver') score+=5;
      score+=Math.round((Number(t.rating||4)-3)*5);
      score-=Math.round((t.penaltyPoints||0)/10);
      if(preferred_tech_id&&t.id===preferred_tech_id) score+=30;
      score=Math.min(100,Math.max(0,score));
      const tLat=t.extra_data?.latitude||t.latitude, tLng=t.extra_data?.longitude||t.longitude;
      return { tech_id:t.id,name:t.name,match_score:parseFloat(score.toFixed(1)),skill_level:`Level ${reqSkill}`,tier:t.tier,rating:Number(t.rating||4.5),completed_jobs:t.completedJobs||0,primary_zone:t.primaryZone,proximity_km:haversineKm(Number(lat),Number(lng),tLat,tLng),available_slots:computeSlots(t,durHrs),starting_price:svcMeta?.price_standard||null };
    })
    .filter(t=>t.available_slots.length>0);

  if(sort_by==='rating') scored.sort((a,b)=>b.rating-a.rating);
  else if(sort_by==='proximity'&&lat&&lng) scored.sort((a,b)=>(a.proximity_km||999)-(b.proximity_km||999));
  else if(sort_by==='price') scored.sort((a,b)=>(a.starting_price||0)-(b.starting_price||0));
  else scored.sort((a,b)=>b.match_score-a.match_score);

  return res.json({ status:'success', search_params:{service_category,service_sub_category,booking_date,postal_code,lat,lng}, service_info:svcMeta, estimated_job_duration_hours:durHrs, result_count:scored.slice(0,Number(max_results)).length, results:scored.slice(0,Number(max_results)) });
});

// ΓöÇΓöÇ TECHNICIAN PROFILE ΓöÇΓöÇ
app.get('/api/vbooking/technicians/:tech_id', vbAuth, async (req, res) => {
  const techs = await vbLoadTechs();
  const t = techs.find(x=>x.id===req.params.tech_id||x.code===req.params.tech_id);
  if(!t) return res.status(404).json({ status:'error', code:'NOT_FOUND', message:'α╣äα╕íα╣êα╕₧α╕Üα╕èα╣êα╕▓α╕çα╕Öα╕╡α╣ë' });
  const {id,code,name,phone,avatar,tier,rating,status,primaryZone,secondaryZones,skills,completedJobs,penaltyPoints,dailyCapacityHours,workDays,jobTypes,skillsExpertise}=t;
  return res.json({ status:'success', technician:{id,code,name,phone,avatar,tier,rating:Number(rating),status,primary_zone:primaryZone,secondary_zones:secondaryZones,skills,completed_jobs:completedJobs,penalty_points:penaltyPoints,daily_capacity_hours:dailyCapacityHours,work_days:workDays,job_types:jobTypes,skills_expertise:skillsExpertise} });
});

// ΓöÇΓöÇ AVAILABLE SLOTS ΓöÇΓöÇ
app.get('/api/vbooking/technicians/:tech_id/slots', vbAuth, async (req, res) => {
  const techs = await vbLoadTechs();
  const t = techs.find(x=>x.id===req.params.tech_id);
  if(!t) return res.status(404).json({ status:'error', code:'NOT_FOUND', message:'α╣äα╕íα╣êα╕₧α╕Üα╕èα╣êα╕▓α╕çα╕Öα╕╡α╣ë' });
  const { date_from, date_to, service_sub_category } = req.query;
  const catalog=vbLoadCatalog(); let durHrs=3;
  if(service_sub_category){for(const cat of catalog){const s=cat.sub_categories?.find(x=>x.code===service_sub_category);if(s){durHrs=s.est_duration_hours;break;}}}
  const from=new Date(date_from||new Date()), days=Math.min(14,Math.round((new Date(date_to||new Date(from.getTime()+7*86400000))-from)/86400000)+1);
  const availability=[];
  const dayNames=['α╕¡α╕▓','α╕ê','α╕¡','α╕₧','α╕₧α╕ñ','α╕¿','α╕¬'];
  for(let i=0;i<days;i++){const d=new Date(from.getTime()+i*86400000);const dow=d.getDay();const slots=dow===0||dow===6?[]:computeSlots(t,durHrs);availability.push({date:d.toISOString().split('T')[0],day_of_week:dayNames[dow],is_available:slots.length>0,slots});}
  return res.json({ status:'success', tech_id:t.id, tech_name:t.name, estimated_job_duration_hours:durHrs, availability });
});

// ΓöÇΓöÇ BOOKING HOLD (Step 1) ΓöÇΓöÇ
app.post('/api/vbooking/bookings/hold', vbAuth, async (req, res) => {
  const { tech_id, service_category, service_sub_category, booking_date, time_slot, location, client_ref_id } = req.body;
  if(!tech_id||!service_sub_category||!booking_date||!time_slot) return res.status(400).json({ status:'error', code:'MISSING_PARAMS', message:'α╕òα╣ëα╕¡α╕çα╕úα╕░α╕Üα╕╕ tech_id, service_sub_category, booking_date, time_slot' });
  const techs=await vbLoadTechs(), tech=techs.find(t=>t.id===tech_id);
  if(!tech) return res.status(404).json({ status:'error', code:'NOT_FOUND', message:'α╣äα╕íα╣êα╕₧α╕Üα╕èα╣êα╕▓α╕çα╕Öα╕╡α╣ë' });
  if(tech.status==='In Cooldown'||tech.status==='Offline') return res.status(409).json({ status:'error', code:'TECH_UNAVAILABLE', message:`α╕èα╣êα╕▓α╕ç ${tech.name} α╣äα╕íα╣êα╕₧α╕úα╣ëα╕¡α╕íα╕úα╕▒α╕Üα╕çα╕▓α╕Ö (${tech.status})` });
  const dup=[...vbookingHoldsMap.values()].find(h=>h.tech_id===tech_id&&h.booking_date===booking_date&&h.time_slot===time_slot&&h.status==='ACTIVE'&&new Date(h.expires_at)>new Date());
  if(dup) return res.status(409).json({ status:'error', code:'SLOT_TAKEN', message:`α╕¬α╕Ñα╣çα╕¡α╕ò ${time_slot} α╕ºα╕▒α╕Öα╕ùα╕╡α╣ê ${booking_date} α╕ûα╕╣α╕üα╕Ñα╣çα╕¡α╕äα╣üα╕Ñα╣ëα╕º α╕üα╕úα╕╕α╕ôα╕▓α╣Çα╕Ñα╕╖α╕¡α╕üα╕¬α╕Ñα╣çα╕¡α╕òα╕¡α╕╖α╣êα╕Ö` });
  const holdId=genId('hold'), holdToken=`HOLD_${randomBytes(8).toString('hex').toUpperCase()}`, ttl=900, expiresAt=new Date(Date.now()+ttl*1000).toISOString();
  const h={id:holdId,hold_token:holdToken,client_id:req.vbClient.id,client_ref_id:client_ref_id||null,tech_id,service_category:service_category||null,service_sub_category,booking_date,time_slot,location:location||{},expires_at:expiresAt,status:'ACTIVE',created_at:new Date().toISOString()};
  vbookingHoldsMap.set(holdToken,h);
  if(isDbConnected&&dbPool){try{await dbPool.query('INSERT INTO vbooking_booking_holds (id,hold_token,client_id,tech_id,service_category,service_sub_category,booking_date,time_slot,location,expires_at,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[holdId,holdToken,req.vbClient.id,tech_id,service_category||null,service_sub_category,booking_date,time_slot,JSON.stringify(location||{}),'ACTIVE',expiresAt]);}catch(e){console.warn('hold DB warn:',e.message);}}
  setTimeout(()=>{const x=vbookingHoldsMap.get(holdToken);if(x&&x.status==='ACTIVE'){x.status='EXPIRED';vbookingHoldsMap.set(holdToken,x);}},ttl*1000);
  return res.status(201).json({ status:'success', message:'α╕Ñα╣çα╕¡α╕äα╕¬α╕Ñα╣çα╕¡α╕òα╕èα╣êα╕▓α╕çα╕¬α╕│α╣Çα╕úα╣çα╕ê α╕üα╕úα╕╕α╕ôα╕▓ Confirm α╕áα╕▓α╕óα╣âα╕Ö 15 α╕Öα╕▓α╕ùα╕╡', hold_token:holdToken, tech_id, tech_name:tech.name, booking_date, time_slot, service_sub_category, expires_at:expiresAt, ttl_seconds:ttl });
});

// ΓöÇΓöÇ BOOKING CONFIRM (Step 2) ΓöÇΓöÇ
app.post('/api/vbooking/bookings/confirm', vbAuth, async (req, res) => {
  const { hold_token, customer_info, payment_info, notes } = req.body;
  if(!hold_token) return res.status(400).json({ status:'error', code:'MISSING_PARAMS', message:'α╕òα╣ëα╕¡α╕çα╕úα╕░α╕Üα╕╕ hold_token' });
  if(!customer_info?.name||!customer_info?.phone) return res.status(400).json({ status:'error', code:'MISSING_PARAMS', message:'α╕òα╣ëα╕¡α╕çα╕úα╕░α╕Üα╕╕ customer_info.name α╣üα╕Ñα╕░ customer_info.phone' });
  let hold=vbookingHoldsMap.get(hold_token);
  if(!hold&&isDbConnected&&dbPool){try{const r=await dbPool.query('SELECT * FROM vbooking_booking_holds WHERE hold_token=$1',[hold_token]);if(r.rows.length)hold=r.rows[0];}catch{}}
  if(!hold) return res.status(404).json({ status:'error', code:'HOLD_NOT_FOUND', message:'α╣äα╕íα╣êα╕₧α╕Ü Hold Token α╕Öα╕╡α╣ë' });
  if(hold.status==='EXPIRED'||new Date(hold.expires_at)<new Date()) return res.status(410).json({ status:'error', code:'HOLD_EXPIRED', message:'Hold Token α╕½α╕íα╕öα╕¡α╕▓α╕óα╕╕α╣üα╕Ñα╣ëα╕º α╕üα╕úα╕╕α╕ôα╕▓ Hold α╣âα╕½α╕íα╣ê' });
  if(hold.status==='CONFIRMED') return res.status(409).json({ status:'error', code:'ALREADY_CONFIRMED', message:'α╕üα╕▓α╕úα╕êα╕¡α╕çα╕Öα╕╡α╣ëα╕ûα╕╣α╕ü Confirm α╣üα╕Ñα╣ëα╕º' });
  if(hold.client_id!==req.vbClient.id) return res.status(403).json({ status:'error', code:'FORBIDDEN', message:'Hold α╕Öα╕╡α╣ëα╣äα╕íα╣êα╣äα╕öα╣ëα╣Çα╕¢α╣çα╕Öα╕éα╕¡α╕ç Client α╕ùα╣êα╕▓α╕Ö' });
  const techs=await vbLoadTechs(), tech=techs.find(t=>t.id===hold.tech_id);
  const catalog=vbLoadCatalog(); let durHrs=3;
  for(const cat of catalog){const s=cat.sub_categories?.find(x=>x.code===hold.service_sub_category);if(s){durHrs=s.est_duration_hours;break;}}
  const bookingId=genId('bk'), bookingRef=`BK-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const bk={id:bookingId,booking_ref:bookingRef,hold_token,client_id:req.vbClient.id,client_ref_id:hold.client_ref_id||null,tech_id:hold.tech_id,tech_name:tech?.name||'N/A',service_category:hold.service_category||null,service_sub_category:hold.service_sub_category,booking_date:hold.booking_date,time_slot:hold.time_slot,est_duration_hours:durHrs,customer_name:customer_info.name,customer_phone:customer_info.phone,customer_email:customer_info.email||null,location:hold.location||{},payment_status:payment_info?.payment_status||'PENDING',payment_ref:payment_info?.transaction_ref||null,status:'CONFIRMED',notes:notes||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const hx=vbookingHoldsMap.get(hold_token); if(hx){hx.status='CONFIRMED';vbookingHoldsMap.set(hold_token,hx);}
  vbookingBookingsStore.push(bk); saveJson(path.join(DATA_DIR,'vbooking_bookings.json'),vbookingBookingsStore);
  if(isDbConnected&&dbPool){try{await dbPool.query('INSERT INTO vbooking_bookings (id,booking_ref,hold_token,client_id,client_ref_id,tech_id,tech_name,service_category,service_sub_category,booking_date,time_slot,est_duration_hours,customer_name,customer_phone,customer_email,location,payment_status,payment_ref,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)',[bookingId,bookingRef,hold_token,req.vbClient.id,hold.client_ref_id||null,hold.tech_id,tech?.name||'N/A',hold.service_category||null,hold.service_sub_category,hold.booking_date,hold.time_slot,durHrs,customer_info.name,customer_info.phone,customer_info.email||null,JSON.stringify(hold.location||{}),payment_info?.payment_status||'PENDING',payment_info?.transaction_ref||null,'CONFIRMED',notes||null]);await dbPool.query('UPDATE vbooking_booking_holds SET status=$1 WHERE hold_token=$2',['CONFIRMED',hold_token]);}catch(e){console.warn('confirm DB warn:',e.message);}}
  return res.status(201).json({ status:'success', message:'α╕óα╕╖α╕Öα╕óα╕▒α╕Öα╕üα╕▓α╕úα╕êα╕¡α╕çα╕Üα╕úα╕┤α╕üα╕▓α╕úα╕¬α╕│α╣Çα╕úα╣çα╕ê', booking_id:bookingId, booking_ref:bookingRef, status:'CONFIRMED', assigned_technician:{tech_id:hold.tech_id,name:tech?.name||'N/A',phone:tech?.phone||null}, booking_date:hold.booking_date, time_slot:hold.time_slot, service_sub_category:hold.service_sub_category, estimated_duration_hours:durHrs, customer:{name:customer_info.name,phone:customer_info.phone}, created_at:bk.created_at });
});

// ΓöÇΓöÇ GET BOOKING STATUS ΓöÇΓöÇ
app.get('/api/vbooking/bookings/:booking_id', vbAuth, async (req, res) => {
  const id=req.params.booking_id; let bk=null;
  if(isDbConnected&&dbPool){try{const r=await dbPool.query('SELECT * FROM vbooking_bookings WHERE id=$1 OR booking_ref=$1',[id]);if(r.rows.length)bk=r.rows[0];}catch{}}
  if(!bk) bk=vbookingBookingsStore.find(b=>b.id===id||b.booking_ref===id);
  if(!bk) return res.status(404).json({ status:'error', code:'NOT_FOUND', message:'α╣äα╕íα╣êα╕₧α╕Üα╕üα╕▓α╕úα╕êα╕¡α╕çα╕Öα╕╡α╣ë' });
  if(bk.client_id!==req.vbClient.id) return res.status(403).json({ status:'error', code:'FORBIDDEN', message:'α╣äα╕íα╣êα╕íα╕╡α╕¬α╕┤α╕ùα╕ÿα╕┤α╣îα╣Çα╕éα╣ëα╕▓α╕ûα╕╢α╕çα╕üα╕▓α╕úα╕êα╕¡α╕çα╕Öα╕╡α╣ë' });
  return res.json({ status:'success', booking:bk });
});

// ΓöÇΓöÇ CANCEL BOOKING ΓöÇΓöÇ
app.post('/api/vbooking/bookings/:booking_id/cancel', vbAuth, async (req, res) => {
  const id=req.params.booking_id, { reason }=req.body; let bk=null;
  if(isDbConnected&&dbPool){try{const r=await dbPool.query('SELECT * FROM vbooking_bookings WHERE id=$1 OR booking_ref=$1',[id]);if(r.rows.length)bk=r.rows[0];}catch{}}
  if(!bk) bk=vbookingBookingsStore.find(b=>b.id===id||b.booking_ref===id);
  if(!bk) return res.status(404).json({ status:'error', code:'NOT_FOUND', message:'α╣äα╕íα╣êα╕₧α╕Üα╕üα╕▓α╕úα╕êα╕¡α╕çα╕Öα╕╡α╣ë' });
  if(bk.client_id!==req.vbClient.id) return res.status(403).json({ status:'error', code:'FORBIDDEN', message:'α╣äα╕íα╣êα╕íα╕╡α╕¬α╕┤α╕ùα╕ÿα╕┤α╣îα╕óα╕üα╣Çα╕Ñα╕┤α╕üα╕üα╕▓α╕úα╕êα╕¡α╕çα╕Öα╕╡α╣ë' });
  if(bk.status==='CANCELLED') return res.status(409).json({ status:'error', code:'ALREADY_CANCELLED', message:'α╕üα╕▓α╕úα╕êα╕¡α╕çα╕Öα╕╡α╣ëα╕ûα╕╣α╕üα╕óα╕üα╣Çα╕Ñα╕┤α╕üα╣üα╕Ñα╣ëα╕º' });
  const idx=vbookingBookingsStore.findIndex(b=>b.id===id||b.booking_ref===id); if(idx>=0){vbookingBookingsStore[idx].status='CANCELLED';vbookingBookingsStore[idx].updated_at=new Date().toISOString();}
  saveJson(path.join(DATA_DIR,'vbooking_bookings.json'),vbookingBookingsStore);
  if(isDbConnected&&dbPool){try{await dbPool.query('UPDATE vbooking_bookings SET status=$1,updated_at=NOW() WHERE id=$2 OR booking_ref=$2',['CANCELLED',id]);}catch{}}
  return res.json({ status:'success', message:`α╕óα╕üα╣Çα╕Ñα╕┤α╕üα╕üα╕▓α╕úα╕êα╕¡α╕ç ${bk.booking_ref} α╕¬α╕│α╣Çα╕úα╣çα╕ê`, booking_ref:bk.booking_ref, cancelled_at:new Date().toISOString(), reason:reason||null });
});

// ΓöÇΓöÇ ADMIN: CREATE CLIENT ΓöÇΓöÇ
app.post('/api/vbooking/admin/clients', vbAdmin, (req, res) => {
  const { name, rate_limit_per_min=60, daily_quota=10000 } = req.body;
  if(!name) return res.status(400).json({ status:'error', message:'α╕òα╣ëα╕¡α╕çα╕úα╕░α╕Üα╕╕ name' });
  const cid=`CLIENT_${name.toUpperCase().replace(/\s+/g,'_').slice(0,16)}_${randomBytes(3).toString('hex').toUpperCase()}`;
  const apiKey=generateApiKey(cid), keyHash=hashApiKey(apiKey), keyPrefix=apiKey.slice(0,16);
  const c={id:cid,name,api_key_hash:keyHash,api_key_prefix:keyPrefix,rate_limit_per_min:Number(rate_limit_per_min),daily_quota:Number(daily_quota),status:'ACTIVE',created_at:new Date().toISOString()};
  vbookingClientsStore.push(c); saveJson(path.join(DATA_DIR,'vbooking_clients.json'),vbookingClientsStore);
  if(isDbConnected&&dbPool){try{dbPool.query('INSERT INTO vbooking_clients (id,name,api_key_hash,api_key_prefix,rate_limit_per_min,daily_quota,status) VALUES ($1,$2,$3,$4,$5,$6,$7)',[cid,name,keyHash,keyPrefix,rate_limit_per_min,daily_quota,'ACTIVE']);}catch{}}
  return res.status(201).json({ status:'success', message:'α╕¬α╕úα╣ëα╕▓α╕ç API Client α╕¬α╕│α╣Çα╕úα╣çα╕ê ΓÇö α╕Üα╕▒α╕Öα╕ùα╕╢α╕ü API Key α╕Öα╕╡α╣ëα╣äα╕ºα╣ë (α╣üα╕¬α╕öα╕çα╣Çα╕₧α╕╡α╕óα╕çα╕äα╕úα╕▒α╣ëα╕çα╣Çα╕öα╕╡α╕óα╕º)', client:{...c,api_key:apiKey} });
});

// ΓöÇΓöÇ ADMIN: LIST CLIENTS ΓöÇΓöÇ
app.get('/api/vbooking/admin/clients', vbAdmin, async (req, res) => {
  let clients=[];
  if(isDbConnected&&dbPool){try{const r=await dbPool.query('SELECT id,name,api_key_prefix,rate_limit_per_min,daily_quota,status,created_at FROM vbooking_clients ORDER BY created_at DESC');clients=r.rows;}catch{}}
  if(!clients.length) clients=vbookingClientsStore.map(({api_key_hash,...rest})=>rest);
  const today=new Date().toISOString().split('T')[0];
  for(const c of clients) c.requests_today=vbookingLogsStore.filter(l=>l.client_id===c.id&&l.created_at.startsWith(today)).length;
  return res.json({ status:'success', count:clients.length, clients });
});

// ΓöÇΓöÇ ADMIN: METRICS ΓöÇΓöÇ
app.get('/api/vbooking/admin/monitoring/metrics', vbAdmin, async (req, res) => {
  let logs=[...vbookingLogsStore];
  if(isDbConnected&&dbPool){try{const r=await dbPool.query("SELECT * FROM vbooking_request_logs WHERE created_at>=NOW()-INTERVAL '7 days' ORDER BY created_at DESC LIMIT 5000");if(r.rows.length)logs=r.rows;}catch{}}
  const now=new Date(), todayStr=now.toISOString().split('T')[0];
  const today=logs.filter(l=>l.created_at.startsWith(todayStr));
  const ok=today.filter(l=>l.status_code<400), err=today.filter(l=>l.status_code>=400), rl=today.filter(l=>l.status_code===429);
  const lats=today.map(l=>Number(l.response_time_ms||0)).filter(v=>v>0).sort((a,b)=>a-b);
  const avg=lats.length?Math.round(lats.reduce((a,b)=>a+b,0)/lats.length):0, p95=lats.length?lats[Math.floor(lats.length*0.95)]||0:0;
  const oneMinAgo=new Date(now-60000).toISOString(), rpm=logs.filter(l=>l.created_at>oneMinAgo).length;
  const tot=today.length||1, s2=today.filter(l=>l.status_code<300).length, s4=today.filter(l=>l.status_code>=400&&l.status_code<500).length, s5=today.filter(l=>l.status_code>=500).length;
  const epC={}, clC={}, clN={}; for(const l of today){epC[l.endpoint]=(epC[l.endpoint]||0)+1;if(l.client_id){clC[l.client_id]=(clC[l.client_id]||0)+1;clN[l.client_id]=l.client_name;}}
  const topEp=Object.entries(epC).sort(([,a],[,b])=>b-a).slice(0,5).map(([endpoint,count])=>({endpoint,count}));
  const topCl=Object.entries(clC).sort(([,a],[,b])=>b-a).slice(0,5).map(([cid,count])=>({client_id:cid,client_name:clN[cid]||cid,count}));
  const hourly=[]; for(let h=23;h>=0;h--){const s=new Date(now-h*3600000),e=new Date(now-(h-1)*3600000);const hl=logs.filter(l=>{const t=new Date(l.created_at);return t>=s&&t<e;});hourly.push({hour:String(s.getHours()).padStart(2,'0'),requests:hl.length,errors:hl.filter(l=>l.status_code>=400).length});}
  return res.json({ status:'success', metrics:{ total_requests_today:today.length, total_requests_week:logs.length, success_rate:today.length?parseFloat(((ok.length/today.length)*100).toFixed(1)):0, error_rate:today.length?parseFloat(((err.length/today.length)*100).toFixed(1)):0, avg_latency_ms:avg, p95_latency_ms:p95, rpm_current:rpm, rpm_peak:rpm, rate_limit_hits:rl.length, top_endpoints:topEp, top_clients:topCl, status_distribution:[{status:'2xx',count:s2,pct:parseFloat(((s2/tot)*100).toFixed(1))},{status:'4xx',count:s4,pct:parseFloat(((s4/tot)*100).toFixed(1))},{status:'5xx',count:s5,pct:parseFloat(((s5/tot)*100).toFixed(1))}], hourly_trend:hourly } });
});

// ΓöÇΓöÇ ADMIN: LOGS (Paginated) ΓöÇΓöÇ
app.get('/api/vbooking/admin/monitoring/logs', vbAdmin, async (req, res) => {
  const { page=1, limit=20, status_code, client_id, endpoint } = req.query;
  const off=(Number(page)-1)*Number(limit);
  let logs=[];
  if(isDbConnected&&dbPool){
    try{
      const conds=['1=1'], params=[];
      if(status_code){params.push(Number(status_code));conds.push(`status_code=$${params.length}`);}
      if(client_id){params.push(`%${client_id}%`);conds.push(`client_id ILIKE $${params.length}`);}
      if(endpoint){params.push(`%${endpoint}%`);conds.push(`endpoint ILIKE $${params.length}`);}
      params.push(Number(limit));params.push(off);
      const r=await dbPool.query(`SELECT id,client_id,client_name,endpoint,method,status_code,response_time_ms,client_ip,error_details,created_at FROM vbooking_request_logs WHERE ${conds.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,params);
      logs=r.rows;
    }catch(e){console.warn('logs query warn:',e.message);}
  }
  if(!logs.length){
    let f=[...vbookingLogsStore];
    if(status_code) f=f.filter(l=>String(l.status_code)===String(status_code));
    if(client_id) f=f.filter(l=>(l.client_id||'').includes(client_id));
    if(endpoint) f=f.filter(l=>(l.endpoint||'').includes(endpoint));
    logs=f.slice(off,off+Number(limit));
  }
  return res.json({ status:'success', page:Number(page), limit:Number(limit), count:logs.length, logs });
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

// Serve static built frontend files for production
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`≡ƒÜÇ vService Production Server running on port ${PORT}`);
});
