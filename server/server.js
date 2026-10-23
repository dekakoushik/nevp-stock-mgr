const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'corporate_stock_manager_secure_jwt_2026';

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint for Docker & load balancers
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // Check if user is still active
    const currentUser = db.prepare('SELECT id, username, fullName, role, status FROM users WHERE id = ?').get(user.id);
    if (!currentUser || currentUser.status !== 'active') {
      return res.status(403).json({ error: 'User account is deactivated or no longer exists' });
    }
    req.user = currentUser;
    next();
  });
}

// Role Authorization Middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] role` });
    }
    next();
  };
}

// Audit Log Helper
function logAudit(userId, action, details, req) {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    db.prepare('INSERT INTO audit_logs (userId, action, details, ipAddress) VALUES (?, ?, ?, ?)')
      .run(userId, action, details, ip);
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
}

// =================== AUTH ROUTES =================== //

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'This account has been deactivated. Contact Superadmin.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  logAudit(user.id, 'USER_LOGIN', `User ${user.username} logged in successfully`, req);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      status: user.status
    }
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Change own password
app.post('/api/auth/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Incorrect current password' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.user.id);

  logAudit(req.user.id, 'PASSWORD_CHANGE', 'User updated personal password', req);
  res.json({ message: 'Password updated successfully' });
});

// =================== SUPERADMIN USER MANAGEMENT =================== //

// List all users
app.get('/api/users', authenticateToken, requireRole('superadmin'), (req, res) => {
  const users = db.prepare(`
    SELECT id, username, fullName, role, status, createdAt, updatedAt 
    FROM users 
    ORDER BY id ASC
  `).all();
  res.json({ users });
});

// Create new user (Superadmin can create user or admin or superadmin)
app.post('/api/users', authenticateToken, requireRole('superadmin'), (req, res) => {
  const { username, fullName, password, role, status } = req.body;

  if (!username || !fullName || !password || !role) {
    return res.status(400).json({ error: 'All fields (username, fullName, password, role) are required' });
  }

  if (!['superadmin', 'admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role must be superadmin, admin, or user' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const userStatus = status === 'inactive' ? 'inactive' : 'active';

  const result = db.prepare(`
    INSERT INTO users (username, fullName, password, role, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(username.trim(), fullName.trim(), hash, role, userStatus);

  logAudit(req.user.id, 'USER_CREATED', `Superadmin created account: ${username} (${role})`, req);

  res.status(201).json({
    message: 'User created successfully',
    userId: result.lastInsertRowid
  });
});

// Modify user details (Role, FullName, Status)
app.put('/api/users/:id', authenticateToken, requireRole('superadmin'), (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { fullName, role, status } = req.body;

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent superadmin from deactivating/demoting their own current active session directly to prevent lockout
  if (targetId === req.user.id && (status === 'inactive' || role !== 'superadmin')) {
    return res.status(400).json({ error: 'You cannot demote or deactivate your own active superadmin account' });
  }

  const newFullName = fullName ? fullName.trim() : targetUser.fullName;
  const newRole = ['superadmin', 'admin', 'user'].includes(role) ? role : targetUser.role;
  const newStatus = ['active', 'inactive'].includes(status) ? status : targetUser.status;

  db.prepare(`
    UPDATE users 
    SET fullName = ?, role = ?, status = ?, updatedAt = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(newFullName, newRole, newStatus, targetId);

  logAudit(req.user.id, 'USER_MODIFIED', `Superadmin updated user ID ${targetId} (${targetUser.username}) -> Role: ${newRole}, Status: ${newStatus}`, req);

  res.json({ message: 'User updated successfully' });
});

// Superadmin Reset User Password
app.put('/api/users/:id/reset-password', authenticateToken, requireRole('superadmin'), (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }

  const targetUser = db.prepare('SELECT username FROM users WHERE id = ?').get(targetId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(hash, targetId);

  logAudit(req.user.id, 'PASSWORD_RESET', `Superadmin reset password for user: ${targetUser.username} (ID: ${targetId})`, req);

  res.json({ message: `Password for ${targetUser.username} reset successfully` });
});

// Superadmin Delete User
app.delete('/api/users/:id', authenticateToken, requireRole('superadmin'), (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own superadmin account' });
  }

  const targetUser = db.prepare('SELECT username FROM users WHERE id = ?').get(targetId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if user has associated transactions
  const txCount = db.prepare('SELECT COUNT(*) as count FROM stock_transactions WHERE userId = ?').get(targetId).count;
  if (txCount > 0) {
    // If user has historical transactions, marking inactive preserves transactional audit history
    db.prepare("UPDATE users SET status = 'inactive', updatedAt = CURRENT_TIMESTAMP WHERE id = ?").run(targetId);
    logAudit(req.user.id, 'USER_DEACTIVATED_HISTORIC', `Superadmin marked user ${targetUser.username} inactive (retained for ${txCount} historical stock logs)`, req);
    return res.json({ 
      message: `User ${targetUser.username} has ${txCount} stock transactions on record. To preserve audit history, the account has been marked INACTIVE and locked from signing in.`,
      actionTaken: 'deactivated'
    });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  logAudit(req.user.id, 'USER_DELETED', `Superadmin deleted user: ${targetUser.username} (ID: ${targetId})`, req);

  res.json({ message: `User ${targetUser.username} permanently deleted.`, actionTaken: 'deleted' });
});

// =================== STOCK / INVENTORY MANAGEMENT =================== //

// Get products list with fast search & filter
app.get('/api/products', authenticateToken, (req, res) => {
  const { search, category, lowStockOnly } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (sku LIKE ? OR name LIKE ? OR location LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (lowStockOnly === 'true') {
    query += ' AND currentStock <= minStock';
  }

  query += ' ORDER BY name ASC';
  const products = db.prepare(query).all(...params);
  res.json({ products });
});

// Add new product (Admin or Superadmin)
app.post('/api/products', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const { sku, name, category, unit, minStock, currentStock, unitPrice, location } = req.body;

  if (!sku || !name || !category) {
    return res.status(400).json({ error: 'SKU, name, and category are required' });
  }

  const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku.trim());
  if (existing) {
    return res.status(409).json({ error: 'A product with this SKU already exists' });
  }

  const insert = db.prepare(`
    INSERT INTO products (sku, name, category, unit, minStock, currentStock, unitPrice, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialStock = parseFloat(currentStock) || 0;
  const result = insert.run(
    sku.trim(),
    name.trim(),
    category.trim(),
    unit || 'pcs',
    parseInt(minStock, 10) || 10,
    initialStock,
    parseFloat(unitPrice) || 0,
    location || 'Warehouse A'
  );

  // If initial stock was provided, log an initial transaction
  if (initialStock > 0) {
    db.prepare(`
      INSERT INTO stock_transactions (productId, userId, type, quantity, previousStock, newStock, referenceNo, notes)
      VALUES (?, ?, 'IN', ?, 0, ?, 'INITIAL-STOCK', 'Initial inventory count on product creation')
    `).run(result.lastInsertRowid, req.user.id, initialStock, initialStock);
  }

  logAudit(req.user.id, 'PRODUCT_CREATED', `Created item ${sku} (${name})`, req);
  res.status(201).json({ message: 'Product added successfully', id: result.lastInsertRowid });
});

// Update product metadata (Admin or Superadmin)
app.put('/api/products/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const { id } = req.params;
  const { sku, name, category, unit, minStock, unitPrice, location } = req.body;

  const target = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!target) {
    return res.status(404).json({ error: 'Product not found' });
  }

  db.prepare(`
    UPDATE products 
    SET sku = ?, name = ?, category = ?, unit = ?, minStock = ?, unitPrice = ?, location = ?, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    sku || target.sku,
    name || target.name,
    category || target.category,
    unit || target.unit,
    minStock !== undefined ? minStock : target.minStock,
    unitPrice !== undefined ? unitPrice : target.unitPrice,
    location || target.location,
    id
  );

  logAudit(req.user.id, 'PRODUCT_MODIFIED', `Updated item metadata for ID ${id}`, req);
  res.json({ message: 'Product updated successfully' });
});

// =================== CONCURRENT-SAFE STOCK ENTRY =================== //
// Uses SQLite Immediate Transaction for ACID lock on row updates
const recordStockEntryTx = db.transaction((productId, userId, type, quantity, referenceNo, notes) => {
  // Select row with latest stock
  const product = db.prepare('SELECT id, sku, name, currentStock FROM products WHERE id = ?').get(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  const prevStock = parseFloat(product.currentStock);
  let newStock;

  if (type === 'IN') {
    newStock = prevStock + quantity;
  } else if (type === 'OUT') {
    if (prevStock < quantity) {
      throw new Error(`Insufficient stock for ${product.name}. Current stock: ${prevStock}, requested: ${quantity}`);
    }
    newStock = prevStock - quantity;
  } else if (type === 'ADJUST') {
    newStock = quantity; // Absolute adjustment
  } else {
    throw new Error('Invalid entry type. Must be IN, OUT, or ADJUST');
  }

  // Update current stock
  db.prepare('UPDATE products SET currentStock = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
    .run(newStock, productId);

  // Record audit transaction
  const txResult = db.prepare(`
    INSERT INTO stock_transactions (productId, userId, type, quantity, previousStock, newStock, referenceNo, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(productId, userId, type, quantity, prevStock, newStock, referenceNo || null, notes || null);

  return {
    txId: txResult.lastInsertRowid,
    sku: product.sku,
    name: product.name,
    type,
    quantity,
    previousStock: prevStock,
    newStock
  };
});

// Single or batch stock entry (Super-fast, works smoothly for concurrent multi-users)
app.post('/api/stock/entry', authenticateToken, (req, res) => {
  const { entries } = req.body; // Can be single object or array of items: [{ productId, type, quantity, referenceNo, notes }]
  
  const items = Array.isArray(entries) ? entries : [req.body];

  if (!items.length) {
    return res.status(400).json({ error: 'At least one stock entry item is required' });
  }

  const results = [];
  const errors = [];

  // Execute each entry transaction safely
  for (const item of items) {
    const { productId, type, quantity, referenceNo, notes } = item;
    const qty = parseFloat(quantity);

    if (!productId || !type || isNaN(qty) || qty <= 0) {
      errors.push({ item, error: 'Valid productId, type (IN/OUT/ADJUST), and positive quantity are required' });
      continue;
    }

    try {
      const summary = recordStockEntryTx(productId, req.user.id, type, qty, referenceNo, notes);
      results.push(summary);
    } catch (err) {
      errors.push({ item, error: err.message });
    }
  }

  if (results.length > 0) {
    logAudit(req.user.id, 'STOCK_ENTRY', `Logged ${results.length} stock transactions`, req);
  }

  res.json({
    success: results.length > 0,
    processed: results.length,
    failed: errors.length,
    results,
    errors
  });
});

// Get recent transactions feed with user details
app.get('/api/stock/transactions', authenticateToken, (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 30;
  const transactions = db.prepare(`
    SELECT 
      t.id, t.type, t.quantity, t.previousStock, t.newStock, t.referenceNo, t.notes, t.createdAt,
      p.sku, p.name as productName, p.unit, p.category,
      u.username, u.fullName as enteredBy
    FROM stock_transactions t
    JOIN products p ON t.productId = p.id
    JOIN users u ON t.userId = u.id
    ORDER BY t.id DESC
    LIMIT ?
  `).all(limit);

  res.json({ transactions });
});

// Dashboard Statistics Overview
app.get('/api/dashboard/metrics', authenticateToken, (req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const lowStockProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE currentStock <= minStock').get().count;
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get().count;
  
  const todayEntries = db.prepare(`
    SELECT COUNT(*) as count, 
           SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END) as totalIn,
           SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END) as totalOut
    FROM stock_transactions 
    WHERE date(createdAt) = date('now')
  `).get();

  const categoryBreakdown = db.prepare(`
    SELECT category, COUNT(*) as count, SUM(currentStock) as totalQty
    FROM products
    GROUP BY category
    ORDER BY totalQty DESC
  `).all();

  const recentTransactions = db.prepare(`
    SELECT 
      t.id, t.type, t.quantity, t.newStock, t.createdAt,
      p.name as productName, p.sku, p.unit,
      u.fullName as enteredBy
    FROM stock_transactions t
    JOIN products p ON t.productId = p.id
    JOIN users u ON t.userId = u.id
    ORDER BY t.id DESC
    LIMIT 6
  `).all();

  res.json({
    metrics: {
      totalProducts,
      lowStockProducts,
      activeUsers: totalUsers,
      todayEntriesCount: todayEntries.count || 0,
      todayInQty: todayEntries.totalIn || 0,
      todayOutQty: todayEntries.totalOut || 0
    },
    categoryBreakdown,
    recentTransactions
  });
});

// =================== FINISHED GOODS LOT API =================== //

// Check if lot number already exists
app.get('/api/finished-goods/check-lot/:lotNo', authenticateToken, (req, res) => {
  const lotNo = req.params.lotNo.trim();
  const existing = db.prepare('SELECT id, lotNo, createdAt FROM finished_goods_lots WHERE LOWER(lotNo) = LOWER(?)').get(lotNo);
  res.json({ exists: !!existing, lot: existing || null });
});

// Submit finished goods Lot with ACID transaction
const recordFinishedGoodsLotTx = db.transaction((lotNo, items, userId, notes) => {
  // Double check uniqueness inside transaction lock
  const existing = db.prepare('SELECT id FROM finished_goods_lots WHERE LOWER(lotNo) = LOWER(?)').get(lotNo.toLowerCase());
  if (existing) {
    throw new Error(`Lot No. "${lotNo}" already exists in the database. Duplicate lot numbers are restricted.`);
  }

  const totalQty = items.reduce((sum, it) => sum + (parseInt(it.qty, 10) || 0), 0);

  const lotResult = db.prepare(`
    INSERT INTO finished_goods_lots (lotNo, userId, itemCount, totalQty, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(lotNo, userId, items.length, totalQty, notes || null);

  const lotId = lotResult.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO finished_goods_items (
      lotId, lotNo, productType, grade, glue, face, length, width, dimensionUnit,
      thickness, qty, remarks, frame, filler, designCode, colour, brand, weightKg
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const it of items) {
    insertItem.run(
      lotId,
      lotNo,
      it.productType,
      it.grade,
      it.glue,
      it.face || null,
      it.length !== undefined && it.length !== '' ? parseFloat(it.length) : null,
      it.width !== undefined && it.width !== '' ? parseFloat(it.width) : null,
      it.dimensionUnit || 'ft',
      it.thickness !== undefined && it.thickness !== '' ? parseFloat(it.thickness) : null,
      parseInt(it.qty, 10) || 0,
      it.remarks || null,
      it.frame || null,
      it.filler || null,
      it.designCode || null,
      it.colour || null,
      it.brand || null,
      it.weightKg !== undefined && it.weightKg !== '' ? parseFloat(it.weightKg) : null
    );
  }

  return { lotId, lotNo, totalQty, itemCount: items.length };
});

app.post('/api/finished-goods/submit-lot', authenticateToken, (req, res) => {
  const { lotNo, items, notes } = req.body;

  if (!lotNo || !lotNo.trim()) {
    return res.status(400).json({ error: 'Lot No. is mandatory.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Add at least one item to the lot before final submit.' });
  }

  try {
    const trimmedLot = lotNo.trim();
    const result = recordFinishedGoodsLotTx(trimmedLot, items, req.user.id, notes);
    logAudit(req.user.id, 'FINISHED_GOODS_LOT_SUBMIT', `Submitted Lot #${trimmedLot} with ${items.length} item(s)`, req);

    res.status(201).json({
      message: `Lot ${trimmedLot} submitted successfully!`,
      ...result
    });
  } catch (err) {
    console.error('Error submitting lot:', err.message);
    res.status(409).json({ error: err.message });
  }
});

// Get recent submitted finished goods lots
app.get('/api/finished-goods/lots', authenticateToken, (req, res) => {
  const lots = db.prepare(`
    SELECT l.*, u.fullName as createdBy
    FROM finished_goods_lots l
    JOIN users u ON l.userId = u.id
    ORDER BY l.id DESC
    LIMIT 50
  `).all();

  res.json({ lots });
});

// Get items for a specific lot
app.get('/api/finished-goods/lots/:id/items', authenticateToken, (req, res) => {
  const items = db.prepare('SELECT * FROM finished_goods_items WHERE lotId = ? ORDER BY id ASC').all(req.params.id);
  res.json({ items });
});

// Full detailed report export data for Finished Goods (Superadmin / Admin only)
app.get('/api/finished-goods/export-report', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT 
      l.lotNo,
      l.createdAt as lotDate,
      u.fullName as enteredBy,
      i.productType,
      i.grade,
      i.glue,
      i.face,
      i.length,
      i.width,
      i.dimensionUnit,
      i.thickness,
      i.qty,
      i.frame,
      i.filler,
      i.designCode,
      i.colour,
      i.brand,
      i.weightKg,
      i.remarks,
      l.notes as lotBatchNotes
    FROM finished_goods_items i
    JOIN finished_goods_lots l ON i.lotId = l.id
    JOIN users u ON l.userId = u.id
    ORDER BY l.id DESC, i.id ASC
  `).all();

  logAudit(req.user.id, 'REPORT_EXPORT_EXCEL', `Exported Finished Goods report (${rows.length} rows)`, req);
  res.json({ report: rows });
});

// Delete a complete Lot (Superadmin or Admin only)
app.delete('/api/finished-goods/lots/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const lotId = parseInt(req.params.id, 10);
  const targetLot = db.prepare('SELECT * FROM finished_goods_lots WHERE id = ?').get(lotId);

  if (!targetLot) {
    return res.status(404).json({ error: 'Lot record not found.' });
  }

  // Delete items and lot in transaction
  const deleteTx = db.transaction(() => {
    db.prepare('DELETE FROM finished_goods_items WHERE lotId = ?').run(lotId);
    db.prepare('DELETE FROM finished_goods_lots WHERE id = ?').run(lotId);
  });

  deleteTx();
  logAudit(req.user.id, 'LOT_DELETED', `Deleted Finished Goods Lot #${targetLot.lotNo} (ID: ${lotId})`, req);
  res.json({ message: `Lot #${targetLot.lotNo} and its associated items deleted successfully.` });
});

// Update Lot Header (Lot No. or notes) (Superadmin or Admin only)
app.put('/api/finished-goods/lots/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const lotId = parseInt(req.params.id, 10);
  const { lotNo, notes } = req.body;

  const targetLot = db.prepare('SELECT * FROM finished_goods_lots WHERE id = ?').get(lotId);
  if (!targetLot) {
    return res.status(404).json({ error: 'Lot record not found.' });
  }

  const trimmedLot = (lotNo || targetLot.lotNo).trim();

  // If changing lotNo, ensure uniqueness
  if (trimmedLot.toLowerCase() !== targetLot.lotNo.toLowerCase()) {
    const existing = db.prepare('SELECT id FROM finished_goods_lots WHERE LOWER(lotNo) = LOWER(?) AND id != ?').get(trimmedLot, lotId);
    if (existing) {
      return res.status(409).json({ error: `Lot No. "${trimmedLot}" already exists. Cannot rename to a duplicate lot.` });
    }
  }

  const updateTx = db.transaction(() => {
    db.prepare('UPDATE finished_goods_lots SET lotNo = ?, notes = ? WHERE id = ?').run(trimmedLot, notes || null, lotId);
    db.prepare('UPDATE finished_goods_items SET lotNo = ? WHERE lotId = ?').run(trimmedLot, lotId);
  });

  updateTx();
  logAudit(req.user.id, 'LOT_MODIFIED', `Modified Lot #${targetLot.lotNo} -> #${trimmedLot}`, req);
  res.json({ message: `Lot #${trimmedLot} updated successfully.` });
});

// Update a single item within a lot (Superadmin or Admin only)
app.put('/api/finished-goods/items/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const item = db.prepare('SELECT * FROM finished_goods_items WHERE id = ?').get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const { productType, grade, glue, face, length, width, thickness, qty, remarks, frame, filler, designCode, colour, brand, weightKg } = req.body;

  const newQty = parseInt(qty, 10);
  if (!newQty || newQty <= 0) {
    return res.status(400).json({ error: 'Valid positive quantity required.' });
  }

  const updateItemTx = db.transaction(() => {
    db.prepare(`
      UPDATE finished_goods_items SET
        productType = ?, grade = ?, glue = ?, face = ?, length = ?, width = ?,
        thickness = ?, qty = ?, remarks = ?, frame = ?, filler = ?,
        designCode = ?, colour = ?, brand = ?, weightKg = ?
      WHERE id = ?
    `).run(
      productType || item.productType,
      grade || item.grade,
      glue || item.glue,
      face !== undefined ? face : item.face,
      length !== undefined ? parseFloat(length) : item.length,
      width !== undefined ? parseFloat(width) : item.width,
      thickness !== undefined ? parseFloat(thickness) : item.thickness,
      newQty,
      remarks !== undefined ? remarks : item.remarks,
      frame !== undefined ? frame : item.frame,
      filler !== undefined ? filler : item.filler,
      designCode !== undefined ? designCode : item.designCode,
      colour !== undefined ? colour : item.colour,
      brand !== undefined ? brand : item.brand,
      weightKg !== undefined ? parseFloat(weightKg) : item.weightKg,
      itemId
    );

    // Recalculate lot totalQty
    const stats = db.prepare('SELECT COUNT(*) as count, SUM(qty) as totalQty FROM finished_goods_items WHERE lotId = ?').get(item.lotId);
    db.prepare('UPDATE finished_goods_lots SET itemCount = ?, totalQty = ? WHERE id = ?').run(stats.count, stats.totalQty, item.lotId);
  });

  updateItemTx();
  logAudit(req.user.id, 'LOT_ITEM_MODIFIED', `Modified item ID ${itemId} in Lot #${item.lotNo}`, req);
  res.json({ message: 'Line item updated successfully.' });
});

// Delete a single item within a lot (Superadmin or Admin only)
app.delete('/api/finished-goods/items/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const item = db.prepare('SELECT * FROM finished_goods_items WHERE id = ?').get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const deleteItemTx = db.transaction(() => {
    db.prepare('DELETE FROM finished_goods_items WHERE id = ?').run(itemId);

    // Recalculate lot statistics or delete lot if empty
    const stats = db.prepare('SELECT COUNT(*) as count, SUM(qty) as totalQty FROM finished_goods_items WHERE lotId = ?').get(item.lotId);
    if (stats.count === 0) {
      db.prepare('DELETE FROM finished_goods_lots WHERE id = ?').run(item.lotId);
    } else {
      db.prepare('UPDATE finished_goods_lots SET itemCount = ?, totalQty = ? WHERE id = ?').run(stats.count, stats.totalQty, item.lotId);
    }
  });

  deleteItemTx();
  logAudit(req.user.id, 'LOT_ITEM_DELETED', `Deleted item ID ${itemId} from Lot #${item.lotNo}`, req);
  res.json({ message: 'Line item deleted successfully.' });
});

// ==========================================
// MATTE ENTRY MODULE ROUTES
// ==========================================

// Check if a lotNo already exists in matte_entry_lots
app.get('/api/matte-entry/check-lot/:lotNo', authenticateToken, (req, res) => {
  const lotNo = req.params.lotNo?.trim();
  if (!lotNo) {
    return res.json({ exists: false });
  }

  const existing = db.prepare('SELECT id, lotNo FROM matte_entry_lots WHERE lotNo = ?').get(lotNo);
  res.json({ exists: !!existing, lotNo });
});

// Transaction to record Matte Entry Lot and line items concurrently
const recordMatteEntryLotTx = db.transaction((lotNo, items, userId, notes) => {
  // Double-check uniqueness inside transaction
  const existing = db.prepare('SELECT id FROM matte_entry_lots WHERE lotNo = ?').get(lotNo);
  if (existing) {
    throw new Error(`Lot No. '${lotNo}' has already been registered.`);
  }

  const totalQty = items.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);

  const insertLot = db.prepare(`
    INSERT INTO matte_entry_lots (lotNo, userId, itemCount, totalQty, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  const lotResult = insertLot.run(lotNo, userId, items.length, totalQty, notes || null);
  const lotId = lotResult.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO matte_entry_items (
      lotId, lotNo, productType, grade, glue,
      length, width, dimensionUnit, thickness, qty,
      frame, filler, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const it of items) {
    insertItem.run(
      lotId,
      lotNo,
      it.productType,
      it.grade,
      it.glue,
      parseFloat(it.length) || 0,
      parseFloat(it.width) || 0,
      it.dimensionUnit || 'ft',
      parseFloat(it.thickness) || 0,
      parseInt(it.qty, 10) || 0,
      it.frame || null,
      it.filler || null,
      it.remarks || null
    );
  }

  return { lotId, lotNo, totalQty, itemCount: items.length };
});

app.post('/api/matte-entry/submit-lot', authenticateToken, (req, res) => {
  const { lotNo, items, notes } = req.body;

  if (!lotNo || !lotNo.trim()) {
    return res.status(400).json({ error: 'Lot No. is mandatory.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Add at least one item to the lot before final submit.' });
  }

  try {
    const trimmedLot = lotNo.trim();
    const result = recordMatteEntryLotTx(trimmedLot, items, req.user.id, notes);
    logAudit(req.user.id, 'MATTE_ENTRY_LOT_SUBMIT', `Submitted Matte Lot #${trimmedLot} with ${items.length} item(s)`, req);

    res.status(201).json({
      message: `Matte Lot ${trimmedLot} submitted successfully!`,
      ...result
    });
  } catch (err) {
    console.error('Error submitting matte lot:', err.message);
    res.status(409).json({ error: err.message });
  }
});

// Get recent submitted matte entry lots
app.get('/api/matte-entry/lots', authenticateToken, (req, res) => {
  const lots = db.prepare(`
    SELECT l.*, u.fullName as createdBy
    FROM matte_entry_lots l
    JOIN users u ON l.userId = u.id
    ORDER BY l.id DESC
    LIMIT 50
  `).all();

  res.json({ lots });
});

// Get items for a specific matte lot
app.get('/api/matte-entry/lots/:id/items', authenticateToken, (req, res) => {
  const items = db.prepare('SELECT * FROM matte_entry_items WHERE lotId = ? ORDER BY id ASC').all(req.params.id);
  res.json({ items });
});

// Full detailed report export data for Matte Entry (Superadmin / Admin only)
app.get('/api/matte-entry/export-report', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT 
      l.lotNo,
      l.createdAt as lotDate,
      u.fullName as enteredBy,
      i.productType,
      i.grade,
      i.glue,
      i.length,
      i.width,
      i.dimensionUnit,
      i.thickness,
      i.qty,
      i.frame,
      i.filler,
      i.remarks,
      l.notes as lotBatchNotes
    FROM matte_entry_items i
    JOIN matte_entry_lots l ON i.lotId = l.id
    JOIN users u ON l.userId = u.id
    ORDER BY l.id DESC, i.id ASC
  `).all();

  logAudit(req.user.id, 'REPORT_EXPORT_EXCEL', `Exported Matte Entry report (${rows.length} rows)`, req);
  res.json({ report: rows });
});

// Delete a complete Matte Lot (Superadmin or Admin only)
app.delete('/api/matte-entry/lots/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const lotId = parseInt(req.params.id, 10);
  const targetLot = db.prepare('SELECT * FROM matte_entry_lots WHERE id = ?').get(lotId);

  if (!targetLot) {
    return res.status(404).json({ error: 'Lot not found.' });
  }

  const deleteTx = db.transaction(() => {
    db.prepare('DELETE FROM matte_entry_items WHERE lotId = ?').run(lotId);
    db.prepare('DELETE FROM matte_entry_lots WHERE id = ?').run(lotId);
  });

  deleteTx();
  logAudit(req.user.id, 'MATTE_LOT_DELETED', `Deleted Matte Lot #${targetLot.lotNo} (ID: ${lotId})`, req);
  res.json({ message: `Lot #${targetLot.lotNo} and its items were deleted successfully.` });
});

// Edit Lot Header (Superadmin or Admin only)
app.put('/api/matte-entry/lots/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const lotId = parseInt(req.params.id, 10);
  const { lotNo, notes } = req.body;

  if (!lotNo || !lotNo.trim()) {
    return res.status(400).json({ error: 'Lot No. is required.' });
  }

  const existing = db.prepare('SELECT * FROM matte_entry_lots WHERE id = ?').get(lotId);
  if (!existing) {
    return res.status(404).json({ error: 'Lot not found.' });
  }

  const cleanLotNo = lotNo.trim();
  const duplicate = db.prepare('SELECT id FROM matte_entry_lots WHERE lotNo = ? AND id != ?').get(cleanLotNo, lotId);
  if (duplicate) {
    return res.status(409).json({ error: `Lot No. '${cleanLotNo}' is already used by another batch.` });
  }

  const updateTx = db.transaction(() => {
    db.prepare('UPDATE matte_entry_lots SET lotNo = ?, notes = ? WHERE id = ?').run(cleanLotNo, notes || null, lotId);
    db.prepare('UPDATE matte_entry_items SET lotNo = ? WHERE lotId = ?').run(cleanLotNo, lotId);
  });

  updateTx();
  logAudit(req.user.id, 'MATTE_LOT_MODIFIED', `Updated Matte Lot #${cleanLotNo} (ID: ${lotId})`, req);
  res.json({ message: 'Lot updated successfully.' });
});

// Edit a single item within a matte lot (Superadmin or Admin only)
app.put('/api/matte-entry/items/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const item = db.prepare('SELECT * FROM matte_entry_items WHERE id = ?').get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const {
    productType, grade, glue, length, width, dimensionUnit,
    thickness, qty, frame, filler, remarks
  } = req.body;

  if (!productType || !grade || !glue || !qty) {
    return res.status(400).json({ error: 'Missing mandatory fields.' });
  }

  const updateItemTx = db.transaction(() => {
    db.prepare(`
      UPDATE matte_entry_items SET
        productType = ?, grade = ?, glue = ?,
        length = ?, width = ?, dimensionUnit = ?,
        thickness = ?, qty = ?, frame = ?, filler = ?,
        remarks = ?
      WHERE id = ?
    `).run(
      productType,
      grade,
      glue,
      parseFloat(length) || 0,
      parseFloat(width) || 0,
      dimensionUnit || 'ft',
      parseFloat(thickness) || 0,
      parseInt(qty, 10) || 0,
      frame || null,
      filler || null,
      remarks || null,
      itemId
    );

    // Recalculate lot totalQty
    const stats = db.prepare('SELECT COUNT(*) as count, SUM(qty) as totalQty FROM matte_entry_items WHERE lotId = ?').get(item.lotId);
    db.prepare('UPDATE matte_entry_lots SET itemCount = ?, totalQty = ? WHERE id = ?').run(stats.count, stats.totalQty, item.lotId);
  });

  updateItemTx();
  logAudit(req.user.id, 'MATTE_ITEM_MODIFIED', `Modified item ID ${itemId} in Matte Lot #${item.lotNo}`, req);
  res.json({ message: 'Line item updated successfully.' });
});

// Delete a single item within a matte lot (Superadmin or Admin only)
app.delete('/api/matte-entry/items/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const item = db.prepare('SELECT * FROM matte_entry_items WHERE id = ?').get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const deleteItemTx = db.transaction(() => {
    db.prepare('DELETE FROM matte_entry_items WHERE id = ?').run(itemId);

    // Recalculate lot statistics or delete lot if empty
    const stats = db.prepare('SELECT COUNT(*) as count, SUM(qty) as totalQty FROM matte_entry_items WHERE lotId = ?').get(item.lotId);
    if (stats.count === 0) {
      db.prepare('DELETE FROM matte_entry_lots WHERE id = ?').run(item.lotId);
    } else {
      db.prepare('UPDATE matte_entry_lots SET itemCount = ?, totalQty = ? WHERE id = ?').run(stats.count, stats.totalQty, item.lotId);
    }
  });

  deleteItemTx();
  logAudit(req.user.id, 'MATTE_ITEM_DELETED', `Deleted item ID ${itemId} from Matte Lot #${item.lotNo}`, req);
  res.json({ message: 'Line item deleted successfully.' });
});

// ==========================================
// CHEMICAL ENTRY MODULE ROUTES
// ==========================================

// Check if a lotNo already exists in chemical_entry_lots
app.get('/api/chemical-entry/check-lot/:lotNo', authenticateToken, (req, res) => {
  const lotNo = req.params.lotNo?.trim();
  if (!lotNo) {
    return res.json({ exists: false });
  }

  const existing = db.prepare('SELECT id, lotNo FROM chemical_entry_lots WHERE lotNo = ?').get(lotNo);
  res.json({ exists: !!existing, lotNo });
});

// Transaction to record Chemical Entry Lot and line items
const recordChemicalEntryLotTx = db.transaction((lotNo, items, userId, notes) => {
  // Double-check uniqueness inside transaction
  const existing = db.prepare('SELECT id FROM chemical_entry_lots WHERE lotNo = ?').get(lotNo);
  if (existing) {
    throw new Error(`Lot No. '${lotNo}' has already been registered.`);
  }

  const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);

  const insertLot = db.prepare(`
    INSERT INTO chemical_entry_lots (lotNo, userId, itemCount, totalQty, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  const lotResult = insertLot.run(lotNo, userId, items.length, totalQty, notes || null);
  const lotId = lotResult.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO chemical_entry_items (
      lotId, lotNo, productName, unit, qty, remarks
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const it of items) {
    insertItem.run(
      lotId,
      lotNo,
      it.productName,
      it.unit,
      parseFloat(it.qty) || 0,
      it.remarks || null
    );
  }

  return { lotId, lotNo, totalQty, itemCount: items.length };
});

app.post('/api/chemical-entry/submit-lot', authenticateToken, (req, res) => {
  const { lotNo, items, notes } = req.body;

  if (!lotNo || !lotNo.trim()) {
    return res.status(400).json({ error: 'Lot No. is mandatory.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Add at least one item to the lot before final submit.' });
  }

  try {
    const trimmedLot = lotNo.trim();
    const result = recordChemicalEntryLotTx(trimmedLot, items, req.user.id, notes);
    logAudit(req.user.id, 'CHEMICAL_ENTRY_LOT_SUBMIT', `Submitted Chemical Lot #${trimmedLot} with ${items.length} item(s)`, req);

    res.status(201).json({
      message: `Chemical Lot ${trimmedLot} submitted successfully!`,
      ...result
    });
  } catch (err) {
    console.error('Error submitting chemical lot:', err.message);
    res.status(409).json({ error: err.message });
  }
});

// Get recent submitted chemical entry lots
app.get('/api/chemical-entry/lots', authenticateToken, (req, res) => {
  const lots = db.prepare(`
    SELECT l.*, u.fullName as createdBy
    FROM chemical_entry_lots l
    JOIN users u ON l.userId = u.id
    ORDER BY l.id DESC
    LIMIT 50
  `).all();

  res.json({ lots });
});

// Get items for a specific chemical lot
app.get('/api/chemical-entry/lots/:id/items', authenticateToken, (req, res) => {
  const items = db.prepare('SELECT * FROM chemical_entry_items WHERE lotId = ? ORDER BY id ASC').all(req.params.id);
  res.json({ items });
});

// Full detailed report export data for Chemical Entry (Superadmin / Admin only)
app.get('/api/chemical-entry/export-report', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT 
      l.lotNo,
      l.createdAt as lotDate,
      u.fullName as enteredBy,
      i.productName,
      i.unit,
      i.qty,
      i.remarks,
      l.notes as lotBatchNotes
    FROM chemical_entry_items i
    JOIN chemical_entry_lots l ON i.lotId = l.id
    JOIN users u ON l.userId = u.id
    ORDER BY l.id DESC, i.id ASC
  `).all();

  logAudit(req.user.id, 'REPORT_EXPORT_EXCEL', `Exported Chemical Entry report (${rows.length} rows)`, req);
  res.json({ report: rows });
});

// Delete a complete Chemical Lot (Superadmin or Admin only)
app.delete('/api/chemical-entry/lots/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const lotId = parseInt(req.params.id, 10);
  const targetLot = db.prepare('SELECT * FROM chemical_entry_lots WHERE id = ?').get(lotId);

  if (!targetLot) {
    return res.status(404).json({ error: 'Lot not found.' });
  }

  const deleteTx = db.transaction(() => {
    db.prepare('DELETE FROM chemical_entry_items WHERE lotId = ?').run(lotId);
    db.prepare('DELETE FROM chemical_entry_lots WHERE id = ?').run(lotId);
  });

  deleteTx();
  logAudit(req.user.id, 'CHEMICAL_LOT_DELETED', `Deleted Chemical Lot #${targetLot.lotNo} (ID: ${lotId})`, req);
  res.json({ message: `Lot #${targetLot.lotNo} and its items were deleted successfully.` });
});

// Edit Lot Header (Superadmin or Admin only)
app.put('/api/chemical-entry/lots/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const lotId = parseInt(req.params.id, 10);
  const { lotNo, notes } = req.body;

  if (!lotNo || !lotNo.trim()) {
    return res.status(400).json({ error: 'Lot No. is required.' });
  }

  const existing = db.prepare('SELECT * FROM chemical_entry_lots WHERE id = ?').get(lotId);
  if (!existing) {
    return res.status(404).json({ error: 'Lot not found.' });
  }

  const cleanLotNo = lotNo.trim();
  const duplicate = db.prepare('SELECT id FROM chemical_entry_lots WHERE lotNo = ? AND id != ?').get(cleanLotNo, lotId);
  if (duplicate) {
    return res.status(409).json({ error: `Lot No. '${cleanLotNo}' is already used by another batch.` });
  }

  const updateTx = db.transaction(() => {
    db.prepare('UPDATE chemical_entry_lots SET lotNo = ?, notes = ? WHERE id = ?').run(cleanLotNo, notes || null, lotId);
    db.prepare('UPDATE chemical_entry_items SET lotNo = ? WHERE lotId = ?').run(cleanLotNo, lotId);
  });

  updateTx();
  logAudit(req.user.id, 'CHEMICAL_LOT_MODIFIED', `Updated Chemical Lot #${cleanLotNo} (ID: ${lotId})`, req);
  res.json({ message: 'Lot updated successfully.' });
});

// Edit a single item within a chemical lot (Superadmin or Admin only)
app.put('/api/chemical-entry/items/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const item = db.prepare('SELECT * FROM chemical_entry_items WHERE id = ?').get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const { productName, unit, qty, remarks } = req.body;

  if (!productName || !unit || qty === undefined) {
    return res.status(400).json({ error: 'Missing mandatory fields.' });
  }

  const updateItemTx = db.transaction(() => {
    db.prepare(`
      UPDATE chemical_entry_items SET
        productName = ?, unit = ?, qty = ?, remarks = ?
      WHERE id = ?
    `).run(
      productName,
      unit,
      parseFloat(qty) || 0,
      remarks || null,
      itemId
    );

    // Recalculate lot totalQty
    const stats = db.prepare('SELECT COUNT(*) as count, SUM(qty) as totalQty FROM chemical_entry_items WHERE lotId = ?').get(item.lotId);
    db.prepare('UPDATE chemical_entry_lots SET itemCount = ?, totalQty = ? WHERE id = ?').run(stats.count, stats.totalQty, item.lotId);
  });

  updateItemTx();
  logAudit(req.user.id, 'CHEMICAL_ITEM_MODIFIED', `Modified item ID ${itemId} in Chemical Lot #${item.lotNo}`, req);
  res.json({ message: 'Line item updated successfully.' });
});

// Delete a single item within a chemical lot (Superadmin or Admin only)
app.delete('/api/chemical-entry/items/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const item = db.prepare('SELECT * FROM chemical_entry_items WHERE id = ?').get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const deleteItemTx = db.transaction(() => {
    db.prepare('DELETE FROM chemical_entry_items WHERE id = ?').run(itemId);

    // Recalculate lot statistics or delete lot if empty
    const stats = db.prepare('SELECT COUNT(*) as count, SUM(qty) as totalQty FROM chemical_entry_items WHERE lotId = ?').get(item.lotId);
    if (stats.count === 0) {
      db.prepare('DELETE FROM chemical_entry_lots WHERE id = ?').run(item.lotId);
    } else {
      db.prepare('UPDATE chemical_entry_lots SET itemCount = ?, totalQty = ? WHERE id = ?').run(stats.count, stats.totalQty, item.lotId);
    }
  });

  deleteItemTx();
  logAudit(req.user.id, 'CHEMICAL_ITEM_DELETED', `Deleted item ID ${itemId} from Chemical Lot #${item.lotNo}`, req);
  res.json({ message: 'Line item deleted successfully.' });
});

// ==========================================
// VENEER ENTRY MODULE ROUTES
// ==========================================

// Check if a lotNo already exists in veneer_entry_lots
app.get('/api/veneer-entry/check-lot/:lotNo', authenticateToken, (req, res) => {
  const lotNo = req.params.lotNo?.trim();
  if (!lotNo) {
    return res.json({ exists: false });
  }

  const existing = db.prepare('SELECT id, lotNo FROM veneer_entry_lots WHERE lotNo = ?').get(lotNo);
  res.json({ exists: !!existing, lotNo });
});

// Transaction to record Veneer Entry Lot and line items
const recordVeneerEntryLotTx = db.transaction((lotNo, items, userId, notes) => {
  // Double-check uniqueness inside transaction
  const existing = db.prepare('SELECT id FROM veneer_entry_lots WHERE lotNo = ?').get(lotNo);
  if (existing) {
    throw new Error(`Lot No. '${lotNo}' has already been registered.`);
  }

  const totalQty = items.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);
  const totalSqft = items.reduce((sum, item) => sum + (parseFloat(item.totalSqft) || 0), 0);

  const insertLot = db.prepare(`
    INSERT INTO veneer_entry_lots (lotNo, userId, itemCount, totalQty, totalSqft, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const lotResult = insertLot.run(lotNo, userId, items.length, totalQty, parseFloat(totalSqft.toFixed(2)), notes || null);
  const lotId = lotResult.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO veneer_entry_items (
      lotId, lotNo, productName, grade, thickness,
      lengthFt, widthInch, qty, totalSqft, packingType,
      comment, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const it of items) {
    insertItem.run(
      lotId,
      lotNo,
      it.productName,
      it.grade,
      it.thickness,
      parseFloat(it.lengthFt) || 0,
      parseFloat(it.widthInch) || 0,
      parseInt(it.qty, 10) || 0,
      parseFloat(parseFloat(it.totalSqft).toFixed(2)) || 0,
      it.packingType || 'Loose',
      it.comment || null,
      it.remarks || null
    );
  }

  return { lotId, lotNo, totalQty, totalSqft: parseFloat(totalSqft.toFixed(2)), itemCount: items.length };
});

app.post('/api/veneer-entry/submit-lot', authenticateToken, (req, res) => {
  const { lotNo, items, notes } = req.body;

  if (!lotNo || !lotNo.trim()) {
    return res.status(400).json({ error: 'Lot No. is mandatory.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Add at least one item to the lot before final submit.' });
  }

  try {
    const trimmedLot = lotNo.trim();
    const result = recordVeneerEntryLotTx(trimmedLot, items, req.user.id, notes);
    logAudit(req.user.id, 'VENEER_ENTRY_LOT_SUBMIT', `Submitted Veneer Lot #${trimmedLot} with ${items.length} item(s)`, req);

    res.status(201).json({
      message: `Veneer Lot ${trimmedLot} submitted successfully!`,
      ...result
    });
  } catch (err) {
    console.error('Error submitting veneer lot:', err.message);
    res.status(409).json({ error: err.message });
  }
});

// Get recent submitted veneer entry lots
app.get('/api/veneer-entry/lots', authenticateToken, (req, res) => {
  const lots = db.prepare(`
    SELECT l.*, u.fullName as createdBy
    FROM veneer_entry_lots l
    JOIN users u ON l.userId = u.id
    ORDER BY l.id DESC
    LIMIT 50
  `).all();

  res.json({ lots });
});

// Get items for a specific veneer lot
app.get('/api/veneer-entry/lots/:id/items', authenticateToken, (req, res) => {
  const items = db.prepare('SELECT * FROM veneer_entry_items WHERE lotId = ? ORDER BY id ASC').all(req.params.id);
  res.json({ items });
});

// Full detailed report export data for Veneer Entry (Superadmin / Admin only)
app.get('/api/veneer-entry/export-report', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT 
      l.lotNo,
      l.createdAt as lotDate,
      u.fullName as enteredBy,
      i.productName,
      i.grade,
      i.thickness,
      i.lengthFt,
      i.widthInch,
      i.qty,
      i.totalSqft,
      i.packingType,
      i.comment,
      i.remarks,
      l.notes as lotBatchNotes
    FROM veneer_entry_items i
    JOIN veneer_entry_lots l ON i.lotId = l.id
    JOIN users u ON l.userId = u.id
    ORDER BY l.id DESC, i.id ASC
  `).all();

  logAudit(req.user.id, 'REPORT_EXPORT_EXCEL', `Exported Veneer Entry report (${rows.length} rows)`, req);
  res.json({ report: rows });
});

// Delete a complete Veneer Lot (Superadmin or Admin only)
app.delete('/api/veneer-entry/lots/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const lotId = parseInt(req.params.id, 10);
  const targetLot = db.prepare('SELECT * FROM veneer_entry_lots WHERE id = ?').get(lotId);

  if (!targetLot) {
    return res.status(404).json({ error: 'Lot not found.' });
  }

  const deleteTx = db.transaction(() => {
    db.prepare('DELETE FROM veneer_entry_items WHERE lotId = ?').run(lotId);
    db.prepare('DELETE FROM veneer_entry_lots WHERE id = ?').run(lotId);
  });

  deleteTx();
  logAudit(req.user.id, 'VENEER_LOT_DELETED', `Deleted Veneer Lot #${targetLot.lotNo} (ID: ${lotId})`, req);
  res.json({ message: `Lot #${targetLot.lotNo} and its items were deleted successfully.` });
});

// Edit Lot Header (Superadmin or Admin only)
app.put('/api/veneer-entry/lots/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const lotId = parseInt(req.params.id, 10);
  const { lotNo, notes } = req.body;

  if (!lotNo || !lotNo.trim()) {
    return res.status(400).json({ error: 'Lot No. is required.' });
  }

  const existing = db.prepare('SELECT * FROM veneer_entry_lots WHERE id = ?').get(lotId);
  if (!existing) {
    return res.status(404).json({ error: 'Lot not found.' });
  }

  const cleanLotNo = lotNo.trim();
  const duplicate = db.prepare('SELECT id FROM veneer_entry_lots WHERE lotNo = ? AND id != ?').get(cleanLotNo, lotId);
  if (duplicate) {
    return res.status(409).json({ error: `Lot No. '${cleanLotNo}' is already used by another batch.` });
  }

  const updateTx = db.transaction(() => {
    db.prepare('UPDATE veneer_entry_lots SET lotNo = ?, notes = ? WHERE id = ?').run(cleanLotNo, notes || null, lotId);
    db.prepare('UPDATE veneer_entry_items SET lotNo = ? WHERE lotId = ?').run(cleanLotNo, lotId);
  });

  updateTx();
  logAudit(req.user.id, 'VENEER_LOT_MODIFIED', `Updated Veneer Lot #${cleanLotNo} (ID: ${lotId})`, req);
  res.json({ message: 'Lot updated successfully.' });
});

// Edit a single item within a veneer lot (Superadmin or Admin only)
app.put('/api/veneer-entry/items/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const item = db.prepare('SELECT * FROM veneer_entry_items WHERE id = ?').get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const {
    productName, grade, thickness, lengthFt, widthInch, qty,
    packingType, comment, remarks
  } = req.body;

  if (!productName || !grade || !thickness || qty === undefined) {
    return res.status(400).json({ error: 'Missing mandatory fields.' });
  }

  const lFt = parseFloat(lengthFt) || 0;
  const wInch = parseFloat(widthInch) || 0;
  const qPcs = parseInt(qty, 10) || 0;
  const calculatedSqft = parseFloat(((lFt * (wInch / 12)) * qPcs).toFixed(2));

  const updateItemTx = db.transaction(() => {
    db.prepare(`
      UPDATE veneer_entry_items SET
        productName = ?, grade = ?, thickness = ?,
        lengthFt = ?, widthInch = ?, qty = ?,
        totalSqft = ?, packingType = ?, comment = ?, remarks = ?
      WHERE id = ?
    `).run(
      productName,
      grade,
      thickness,
      lFt,
      wInch,
      qPcs,
      calculatedSqft,
      packingType || 'Loose',
      comment || null,
      remarks || null,
      itemId
    );

    // Recalculate lot totalQty and totalSqft
    const stats = db.prepare('SELECT COUNT(*) as count, SUM(qty) as totalQty, SUM(totalSqft) as totalSqft FROM veneer_entry_items WHERE lotId = ?').get(item.lotId);
    db.prepare('UPDATE veneer_entry_lots SET itemCount = ?, totalQty = ?, totalSqft = ? WHERE id = ?').run(stats.count, stats.totalQty, stats.totalSqft, item.lotId);
  });

  updateItemTx();
  logAudit(req.user.id, 'VENEER_ITEM_MODIFIED', `Modified item ID ${itemId} in Veneer Lot #${item.lotNo}`, req);
  res.json({ message: 'Line item updated successfully.' });
});

// Delete a single item within a veneer lot (Superadmin or Admin only)
app.delete('/api/veneer-entry/items/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const item = db.prepare('SELECT * FROM veneer_entry_items WHERE id = ?').get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const deleteItemTx = db.transaction(() => {
    db.prepare('DELETE FROM veneer_entry_items WHERE id = ?').run(itemId);

    // Recalculate lot statistics or delete lot if empty
    const stats = db.prepare('SELECT COUNT(*) as count, SUM(qty) as totalQty, SUM(totalSqft) as totalSqft FROM veneer_entry_items WHERE lotId = ?').get(item.lotId);
    if (stats.count === 0) {
      db.prepare('DELETE FROM veneer_entry_lots WHERE id = ?').run(item.lotId);
    } else {
      db.prepare('UPDATE veneer_entry_lots SET itemCount = ?, totalQty = ?, totalSqft = ? WHERE id = ?').run(stats.count, stats.totalQty, stats.totalSqft, item.lotId);
    }
  });

  deleteItemTx();
  logAudit(req.user.id, 'VENEER_ITEM_DELETED', `Deleted item ID ${itemId} from Veneer Lot #${item.lotNo}`, req);
  res.json({ message: 'Line item deleted successfully.' });
});

// ==========================================
// FACE VENEER ENTRY MODULE ROUTES
// ==========================================

// Check if a lotNo already exists in face_veneer_entry_lots
app.get('/api/face-veneer-entry/check-lot/:lotNo', authenticateToken, (req, res) => {
  const lotNo = req.params.lotNo?.trim();
  if (!lotNo) {
    return res.json({ exists: false });
  }

  const existing = db.prepare('SELECT id, lotNo FROM face_veneer_entry_lots WHERE lotNo = ?').get(lotNo);
  res.json({ exists: !!existing, lotNo });
});

// Transaction to record Face Veneer Entry Lot and line items
const recordFaceVeneerEntryLotTx = db.transaction((lotNo, items, userId, notes) => {
  // Double-check uniqueness inside transaction
  const existing = db.prepare('SELECT id FROM face_veneer_entry_lots WHERE lotNo = ?').get(lotNo);
  if (existing) {
    throw new Error(`Lot No. '${lotNo}' has already been registered.`);
  }

  const totalQty = items.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);
  const totalArea = items.reduce((sum, item) => sum + (parseFloat(item.totalArea) || 0), 0);

  const insertLot = db.prepare(`
    INSERT INTO face_veneer_entry_lots (lotNo, userId, itemCount, totalQty, totalArea, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const lotResult = insertLot.run(lotNo, userId, items.length, totalQty, parseFloat(totalArea.toFixed(2)), notes || null);
  const lotId = lotResult.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO face_veneer_entry_items (
      lotId, lotNo, veneerType, lengthFt, widthFt, qty, totalArea, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const it of items) {
    insertItem.run(
      lotId,
      lotNo,
      it.veneerType,
      parseFloat(it.lengthFt) || 0,
      parseFloat(it.widthFt) || 0,
      parseInt(it.qty, 10) || 0,
      parseFloat(parseFloat(it.totalArea).toFixed(2)) || 0,
      it.remarks || null
    );
  }

  return { lotId, lotNo, totalQty, totalArea: parseFloat(totalArea.toFixed(2)), itemCount: items.length };
});

app.post('/api/face-veneer-entry/submit-lot', authenticateToken, (req, res) => {
  const { lotNo, items, notes } = req.body;

  if (!lotNo || !lotNo.trim()) {
    return res.status(400).json({ error: 'Lot No. is mandatory.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Add at least one item to the lot before final submit.' });
  }

  try {
    const trimmedLot = lotNo.trim();
    const result = recordFaceVeneerEntryLotTx(trimmedLot, items, req.user.id, notes);
    logAudit(req.user.id, 'FACE_VENEER_ENTRY_LOT_SUBMIT', `Submitted Face Veneer Lot #${trimmedLot} with ${items.length} item(s)`, req);

    res.status(201).json({
      message: `Face Veneer Lot ${trimmedLot} submitted successfully!`,
      ...result
    });
  } catch (err) {
    console.error('Error submitting face veneer lot:', err.message);
    res.status(409).json({ error: err.message });
  }
});

// Get recent submitted face veneer entry lots
app.get('/api/face-veneer-entry/lots', authenticateToken, (req, res) => {
  const lots = db.prepare(`
    SELECT l.*, u.fullName as createdBy
    FROM face_veneer_entry_lots l
    JOIN users u ON l.userId = u.id
    ORDER BY l.id DESC
    LIMIT 50
  `).all();

  res.json({ lots });
});

// Get items for a specific face veneer lot
app.get('/api/face-veneer-entry/lots/:id/items', authenticateToken, (req, res) => {
  const items = db.prepare('SELECT * FROM face_veneer_entry_items WHERE lotId = ? ORDER BY id ASC').all(req.params.id);
  res.json({ items });
});

// Full detailed report export data for Face Veneer Entry (Superadmin / Admin only)
app.get('/api/face-veneer-entry/export-report', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT 
      l.lotNo,
      l.createdAt as lotDate,
      u.fullName as enteredBy,
      i.veneerType,
      i.lengthFt,
      i.widthFt,
      i.qty,
      i.totalArea,
      i.remarks,
      l.notes as lotBatchNotes
    FROM face_veneer_entry_items i
    JOIN face_veneer_entry_lots l ON i.lotId = l.id
    JOIN users u ON l.userId = u.id
    ORDER BY l.id DESC, i.id ASC
  `).all();

  logAudit(req.user.id, 'REPORT_EXPORT_EXCEL', `Exported Face Veneer Entry report (${rows.length} rows)`, req);
  res.json({ report: rows });
});

// Delete a complete Face Veneer Lot (Superadmin or Admin only)
app.delete('/api/face-veneer-entry/lots/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const lotId = parseInt(req.params.id, 10);
  const targetLot = db.prepare('SELECT * FROM face_veneer_entry_lots WHERE id = ?').get(lotId);

  if (!targetLot) {
    return res.status(404).json({ error: 'Lot not found.' });
  }

  const deleteTx = db.transaction(() => {
    db.prepare('DELETE FROM face_veneer_entry_items WHERE lotId = ?').run(lotId);
    db.prepare('DELETE FROM face_veneer_entry_lots WHERE id = ?').run(lotId);
  });

  deleteTx();
  logAudit(req.user.id, 'FACE_VENEER_LOT_DELETED', `Deleted Face Veneer Lot #${targetLot.lotNo} (ID: ${lotId})`, req);
  res.json({ message: `Lot #${targetLot.lotNo} and its items were deleted successfully.` });
});

// Edit Lot Header (Superadmin or Admin only)
app.put('/api/face-veneer-entry/lots/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const lotId = parseInt(req.params.id, 10);
  const { lotNo, notes } = req.body;

  if (!lotNo || !lotNo.trim()) {
    return res.status(400).json({ error: 'Lot No. is required.' });
  }

  const existing = db.prepare('SELECT * FROM face_veneer_entry_lots WHERE id = ?').get(lotId);
  if (!existing) {
    return res.status(404).json({ error: 'Lot not found.' });
  }

  const cleanLotNo = lotNo.trim();
  const duplicate = db.prepare('SELECT id FROM face_veneer_entry_lots WHERE lotNo = ? AND id != ?').get(cleanLotNo, lotId);
  if (duplicate) {
    return res.status(409).json({ error: `Lot No. '${cleanLotNo}' is already used by another batch.` });
  }

  const updateTx = db.transaction(() => {
    db.prepare('UPDATE face_veneer_entry_lots SET lotNo = ?, notes = ? WHERE id = ?').run(cleanLotNo, notes || null, lotId);
    db.prepare('UPDATE face_veneer_entry_items SET lotNo = ? WHERE lotId = ?').run(cleanLotNo, lotId);
  });

  updateTx();
  logAudit(req.user.id, 'FACE_VENEER_LOT_MODIFIED', `Updated Face Veneer Lot #${cleanLotNo} (ID: ${lotId})`, req);
  res.json({ message: 'Lot updated successfully.' });
});

// Edit a single item within a face veneer lot (Superadmin or Admin only)
app.put('/api/face-veneer-entry/items/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const item = db.prepare('SELECT * FROM face_veneer_entry_items WHERE id = ?').get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const { veneerType, lengthFt, widthFt, qty, remarks } = req.body;

  if (!veneerType || lengthFt === undefined || widthFt === undefined || qty === undefined) {
    return res.status(400).json({ error: 'Missing mandatory fields.' });
  }

  const lFt = parseFloat(lengthFt) || 0;
  const wFt = parseFloat(widthFt) || 0;
  const qPcs = parseInt(qty, 10) || 0;
  const calculatedArea = parseFloat(((lFt * wFt) * qPcs).toFixed(2));

  const updateItemTx = db.transaction(() => {
    db.prepare(`
      UPDATE face_veneer_entry_items SET
        veneerType = ?, lengthFt = ?, widthFt = ?, qty = ?,
        totalArea = ?, remarks = ?
      WHERE id = ?
    `).run(
      veneerType,
      lFt,
      wFt,
      qPcs,
      calculatedArea,
      remarks || null,
      itemId
    );

    // Recalculate lot totalQty and totalArea
    const stats = db.prepare('SELECT COUNT(*) as count, SUM(qty) as totalQty, SUM(totalArea) as totalArea FROM face_veneer_entry_items WHERE lotId = ?').get(item.lotId);
    db.prepare('UPDATE face_veneer_entry_lots SET itemCount = ?, totalQty = ?, totalArea = ? WHERE id = ?').run(stats.count, stats.totalQty, stats.totalArea, item.lotId);
  });

  updateItemTx();
  logAudit(req.user.id, 'FACE_VENEER_ITEM_MODIFIED', `Modified item ID ${itemId} in Face Veneer Lot #${item.lotNo}`, req);
  res.json({ message: 'Line item updated successfully.' });
});

// Delete a single item within a face veneer lot (Superadmin or Admin only)
app.delete('/api/face-veneer-entry/items/:id', authenticateToken, requireRole('superadmin', 'admin'), (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const item = db.prepare('SELECT * FROM face_veneer_entry_items WHERE id = ?').get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const deleteItemTx = db.transaction(() => {
    db.prepare('DELETE FROM face_veneer_entry_items WHERE id = ?').run(itemId);

    // Recalculate lot statistics or delete lot if empty
    const stats = db.prepare('SELECT COUNT(*) as count, SUM(qty) as totalQty, SUM(totalArea) as totalArea FROM face_veneer_entry_items WHERE lotId = ?').get(item.lotId);
    if (stats.count === 0) {
      db.prepare('DELETE FROM face_veneer_entry_lots WHERE id = ?').run(item.lotId);
    } else {
      db.prepare('UPDATE face_veneer_entry_lots SET itemCount = ?, totalQty = ?, totalArea = ? WHERE id = ?').run(stats.count, stats.totalQty, stats.totalArea, item.lotId);
    }
  });

  deleteItemTx();
  logAudit(req.user.id, 'FACE_VENEER_ITEM_DELETED', `Deleted item ID ${itemId} from Face Veneer Lot #${item.lotNo}`, req);
  res.json({ message: 'Line item deleted successfully.' });
});

// ==========================================
// COMPREHENSIVE DASHBOARD SUMMARY ROUTE
// ==========================================
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  try {
    // 1. Finished Goods stats
    const fgStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT l.id) as lotCount,
        COALESCE(SUM(l.totalQty), 0) as totalPieces,
        COUNT(i.id) as itemCount
      FROM finished_goods_lots l
      LEFT JOIN finished_goods_items i ON l.id = i.lotId
    `).get();

    const fgByProduct = db.prepare(`
      SELECT productType, SUM(qty) as totalQty, COUNT(*) as count
      FROM finished_goods_items
      GROUP BY productType
      ORDER BY totalQty DESC
    `).all();

    // 2. Matte Entry stats
    const matteStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT l.id) as lotCount,
        COALESCE(SUM(l.totalQty), 0) as totalPieces,
        COUNT(i.id) as itemCount
      FROM matte_entry_lots l
      LEFT JOIN matte_entry_items i ON l.id = i.lotId
    `).get();

    const matteByProduct = db.prepare(`
      SELECT productType, SUM(qty) as totalQty, COUNT(*) as count
      FROM matte_entry_items
      GROUP BY productType
      ORDER BY totalQty DESC
    `).all();

    // 3. Chemical Entry stats
    const chemStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT l.id) as lotCount,
        COALESCE(SUM(l.totalQty), 0) as totalUnits,
        COUNT(i.id) as itemCount
      FROM chemical_entry_lots l
      LEFT JOIN chemical_entry_items i ON l.id = i.lotId
    `).get();

    const chemTopProducts = db.prepare(`
      SELECT productName, unit, SUM(qty) as totalQty, COUNT(*) as count
      FROM chemical_entry_items
      GROUP BY productName, unit
      ORDER BY totalQty DESC
      LIMIT 6
    `).all();

    // 4. Veneers Entry stats
    const veneerStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT l.id) as lotCount,
        COALESCE(SUM(l.totalQty), 0) as totalPieces,
        COALESCE(SUM(l.totalSqft), 0) as totalSqft,
        COUNT(i.id) as itemCount
      FROM veneer_entry_lots l
      LEFT JOIN veneer_entry_items i ON l.id = i.lotId
    `).get();

    const veneerByProduct = db.prepare(`
      SELECT productName, SUM(qty) as totalQty, ROUND(SUM(totalSqft), 2) as totalSqft
      FROM veneer_entry_items
      GROUP BY productName
      ORDER BY totalQty DESC
    `).all();

    // 5. Face Veneer Entry stats
    const faceStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT l.id) as lotCount,
        COALESCE(SUM(l.totalQty), 0) as totalPieces,
        COALESCE(SUM(l.totalArea), 0) as totalArea,
        COUNT(i.id) as itemCount
      FROM face_veneer_entry_lots l
      LEFT JOIN face_veneer_entry_items i ON l.id = i.lotId
    `).get();

    const faceByType = db.prepare(`
      SELECT veneerType, SUM(qty) as totalQty, ROUND(SUM(totalArea), 2) as totalArea
      FROM face_veneer_entry_items
      GROUP BY veneerType
      ORDER BY totalQty DESC
    `).all();

    // 6. Users count
    const userStats = db.prepare(`
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeUsers,
        SUM(CASE WHEN role = 'superadmin' THEN 1 ELSE 0 END) as superadmins,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regularUsers
      FROM users
    `).get();

    // 7. Recent Global Activity (unified across all modules)
    const recentLots = db.prepare(`
      SELECT * FROM (
        SELECT 'Finished Goods' as module, 'finished_goods' as moduleId, l.lotNo, l.itemCount, l.totalQty, l.createdAt as createdAt, u.fullName as createdBy
        FROM finished_goods_lots l JOIN users u ON l.userId = u.id
        UNION ALL
        SELECT 'Matte Entry' as module, 'matte_entry' as moduleId, l.lotNo, l.itemCount, l.totalQty, l.createdAt as createdAt, u.fullName as createdBy
        FROM matte_entry_lots l JOIN users u ON l.userId = u.id
        UNION ALL
        SELECT 'Chemicals' as module, 'chemical_entry' as moduleId, l.lotNo, l.itemCount, l.totalQty, l.createdAt as createdAt, u.fullName as createdBy
        FROM chemical_entry_lots l JOIN users u ON l.userId = u.id
        UNION ALL
        SELECT 'Veneers' as module, 'veneers_entry' as moduleId, l.lotNo, l.itemCount, l.totalQty, l.createdAt as createdAt, u.fullName as createdBy
        FROM veneer_entry_lots l JOIN users u ON l.userId = u.id
        UNION ALL
        SELECT 'Face Veneers' as module, 'face_veneer_entry' as moduleId, l.lotNo, l.itemCount, l.totalQty, l.createdAt as createdAt, u.fullName as createdBy
        FROM face_veneer_entry_lots l JOIN users u ON l.userId = u.id
      )
      ORDER BY createdAt DESC
      LIMIT 10
    `).all();

    res.json({
      summary: {
        totalBatches: (fgStats.lotCount || 0) + (matteStats.lotCount || 0) + (chemStats.lotCount || 0) + (veneerStats.lotCount || 0) + (faceStats.lotCount || 0),
        finishedGoods: fgStats,
        matte: matteStats,
        chemicals: chemStats,
        veneers: veneerStats,
        faceVeneers: faceStats,
        users: userStats
      },
      breakdowns: {
        finishedGoodsByProduct: fgByProduct,
        matteByProduct: matteByProduct,
        chemicalsTop: chemTopProducts,
        veneersByProduct: veneerByProduct,
        faceVeneersByType: faceByType
      },
      recentLots
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to generate dashboard statistics' });
  }
});

// Audit Logs (Superadmin only)
app.get('/api/audit-logs', authenticateToken, requireRole('superadmin'), (req, res) => {
  const logs = db.prepare(`
    SELECT a.*, u.username, u.fullName, u.role
    FROM audit_logs a
    LEFT JOIN users u ON a.userId = u.id
    ORDER BY a.id DESC
    LIMIT 100
  `).all();

  res.json({ logs });
});

app.listen(PORT, () => {
  console.log(`[API Server] Running on http://localhost:${PORT}`);
});
