const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'stock_manager.db');
console.log('[Server Startup] Target SQLite DB Path:', dbPath);

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;
try {
  db = new Database(dbPath, { verbose: null });
  console.log('[Server Startup] Database file opened successfully.');
  // Enable WAL mode (Write-Ahead Logging) for superior multi-user concurrent reads & writes
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
} catch (dbErr) {
  console.error('[FATAL ERROR] Failed to initialize SQLite database:', dbErr);
  process.exit(1);
}

function initDb() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      fullName TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('superadmin', 'admin', 'user')) NOT NULL DEFAULT 'user',
      status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'pcs',
      minStock INTEGER DEFAULT 10,
      currentStock REAL DEFAULT 0,
      unitPrice REAL DEFAULT 0,
      location TEXT DEFAULT 'Warehouse A',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Stock Transactions (Entry logs with full concurrency tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      type TEXT CHECK(type IN ('IN', 'OUT', 'ADJUST')) NOT NULL,
      quantity REAL NOT NULL,
      previousStock REAL NOT NULL,
      newStock REAL NOT NULL,
      referenceNo TEXT,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT
    );
  `);

  // Finished Goods Lots (Enforces unique lotNo)
  db.exec(`
    CREATE TABLE IF NOT EXISTS finished_goods_lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lotNo TEXT UNIQUE NOT NULL,
      userId INTEGER NOT NULL,
      itemCount INTEGER DEFAULT 0,
      totalQty REAL DEFAULT 0,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT
    );
  `);

  // Finished Goods Items belonging to a Lot
  db.exec(`
    CREATE TABLE IF NOT EXISTS finished_goods_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lotId INTEGER NOT NULL,
      lotNo TEXT NOT NULL,
      productType TEXT NOT NULL,
      grade TEXT NOT NULL,
      glue TEXT NOT NULL,
      face TEXT,
      length REAL,
      width REAL,
      dimensionUnit TEXT DEFAULT 'ft',
      thickness REAL,
      qty INTEGER NOT NULL,
      remarks TEXT,
      frame TEXT,
      filler TEXT,
      designCode TEXT,
      colour TEXT,
      brand TEXT,
      weightKg REAL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lotId) REFERENCES finished_goods_lots(id) ON DELETE CASCADE
    );
  `);

  // Matte Entry Lots (Enforces unique lotNo)
  db.exec(`
    CREATE TABLE IF NOT EXISTS matte_entry_lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lotNo TEXT UNIQUE NOT NULL,
      userId INTEGER NOT NULL,
      itemCount INTEGER DEFAULT 0,
      totalQty REAL DEFAULT 0,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT
    );
  `);

  // Matte Entry Items
  db.exec(`
    CREATE TABLE IF NOT EXISTS matte_entry_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lotId INTEGER NOT NULL,
      lotNo TEXT NOT NULL,
      productType TEXT NOT NULL,
      grade TEXT NOT NULL,
      glue TEXT NOT NULL,
      length REAL NOT NULL,
      width REAL NOT NULL,
      dimensionUnit TEXT DEFAULT 'ft',
      thickness REAL NOT NULL,
      qty INTEGER NOT NULL,
      frame TEXT,
      filler TEXT,
      remarks TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lotId) REFERENCES matte_entry_lots(id) ON DELETE CASCADE
    );
  `);

  // Chemical Entry Lots (Enforces unique lotNo)
  db.exec(`
    CREATE TABLE IF NOT EXISTS chemical_entry_lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lotNo TEXT UNIQUE NOT NULL,
      userId INTEGER NOT NULL,
      itemCount INTEGER DEFAULT 0,
      totalQty REAL DEFAULT 0,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT
    );
  `);

  // Chemical Entry Items
  db.exec(`
    CREATE TABLE IF NOT EXISTS chemical_entry_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lotId INTEGER NOT NULL,
      lotNo TEXT NOT NULL,
      productName TEXT NOT NULL,
      unit TEXT NOT NULL,
      qty REAL NOT NULL,
      remarks TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lotId) REFERENCES chemical_entry_lots(id) ON DELETE CASCADE
    );
  `);

  // Veneers Entry Lots (Enforces unique lotNo)
  db.exec(`
    CREATE TABLE IF NOT EXISTS veneer_entry_lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lotNo TEXT UNIQUE NOT NULL,
      userId INTEGER NOT NULL,
      itemCount INTEGER DEFAULT 0,
      totalQty REAL DEFAULT 0,
      totalSqft REAL DEFAULT 0,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT
    );
  `);

  // Veneers Entry Items
  db.exec(`
    CREATE TABLE IF NOT EXISTS veneer_entry_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lotId INTEGER NOT NULL,
      lotNo TEXT NOT NULL,
      productName TEXT NOT NULL,
      grade TEXT NOT NULL,
      thickness TEXT NOT NULL,
      lengthFt REAL NOT NULL,
      widthInch REAL NOT NULL,
      qty INTEGER NOT NULL,
      totalSqft REAL NOT NULL,
      packingType TEXT NOT NULL,
      comment TEXT,
      remarks TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lotId) REFERENCES veneer_entry_lots(id) ON DELETE CASCADE
    );
  `);

  // Face Veneer Entry Lots (Enforces unique lotNo)
  db.exec(`
    CREATE TABLE IF NOT EXISTS face_veneer_entry_lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lotNo TEXT UNIQUE NOT NULL,
      userId INTEGER NOT NULL,
      itemCount INTEGER DEFAULT 0,
      totalQty REAL DEFAULT 0,
      totalArea REAL DEFAULT 0,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT
    );
  `);

  // Face Veneer Entry Items
  db.exec(`
    CREATE TABLE IF NOT EXISTS face_veneer_entry_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lotId INTEGER NOT NULL,
      lotNo TEXT NOT NULL,
      veneerType TEXT NOT NULL,
      lengthFt REAL NOT NULL,
      widthFt REAL NOT NULL,
      qty INTEGER NOT NULL,
      totalArea REAL NOT NULL,
      remarks TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lotId) REFERENCES face_veneer_entry_lots(id) ON DELETE CASCADE
    );
  `);

  // System Audit Logs (Track admin/superadmin actions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      ipAddress TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed or ensure default superadmin exists
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('SuperAdmin@123', salt);

  const existingSuper = db.prepare('SELECT id, password FROM users WHERE username = ?').get('superadmin');
  if (!existingSuper) {
    db.prepare(`
      INSERT INTO users (username, fullName, password, role, status)
      VALUES (?, ?, ?, ?, ?)
    `).run('superadmin', 'System Super Administrator', hash, 'superadmin', 'active');
    console.log('[DB] Created superadmin account.');
  } else {
    // Ensure password matches SuperAdmin@123 if it was somehow altered
    db.prepare('UPDATE users SET password = ?, status = ? WHERE username = ?').run(hash, 'active', 'superadmin');
  }

  // Ensure standard admin & entry user exist
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    const adminHash = bcrypt.hashSync('Admin@123', salt);
    db.prepare(`
      INSERT INTO users (username, fullName, password, role, status)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', 'Floor Operations Admin', adminHash, 'admin', 'active');
  }

  const existingUser1 = db.prepare('SELECT id FROM users WHERE username = ?').get('user1');
  if (!existingUser1) {
    const userHash = bcrypt.hashSync('user1', salt);
    db.prepare(`
      INSERT INTO users (username, fullName, password, role, status)
      VALUES (?, ?, ?, ?, ?)
    `).run('user1', 'Warehouse Staff 1', userHash, 'user', 'active');
  }

  // Seed initial sample inventory items if empty
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (sku, name, category, unit, minStock, currentStock, unitPrice, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleProducts = [
      ['SKU-00101', 'Industrial Valve 2-inch', 'Valves & Fittings', 'pcs', 15, 120, 45.50, 'Rack A-1'],
      ['SKU-00102', 'High Pressure Seal Ring', 'Hardware', 'box', 20, 85, 12.00, 'Rack A-2'],
      ['SKU-00103', 'Hex Bolt Stainless M10', 'Fasteners', 'kg', 50, 310, 8.75, 'Rack B-1'],
      ['SKU-00104', 'Hydraulic Lubricant Oil 5L', 'Chemicals', 'can', 10, 18, 95.00, 'Section C'],
      ['SKU-00105', 'Safety Protective Gloves L', 'Safety Gear', 'pair', 30, 8, 4.25, 'Rack S-1'],
      ['SKU-00106', 'Heavy Duty Caster Wheels', 'Hardware', 'pcs', 12, 44, 28.30, 'Rack B-4']
    ];

    for (const p of sampleProducts) {
      insertProduct.run(...p);
    }
    console.log('[DB] Seeded initial products for stock entry demonstration.');
  }
}

initDb();

module.exports = db;
