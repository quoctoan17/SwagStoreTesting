'use strict';

const fs   = require('fs');
const path = require('path');

// ── Paths to temp data files used in tests ───────────────────
const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');
const ACCOUNTS_FILE = path.join(__dirname, '..', 'data', 'accounts.json');
const ORDERS_FILE   = path.join(__dirname, '..', 'data', 'orders.json');

// ── Backup / restore helpers ─────────────────────────────────
function backup(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch (_) { return null; }
}
function restore(file, data) {
  if (data === null) { try { fs.unlinkSync(file); } catch (_) {} }
  else fs.writeFileSync(file, data);
}

// ── Test suite ───────────────────────────────────────────────

describe('Product CRUD (staff)', () => {
  let origProducts;

  beforeEach(() => {
    origProducts = backup(PRODUCTS_FILE);
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([]));
    jest.resetModules();
  });

  afterEach(() => restore(PRODUCTS_FILE, origProducts));

  test('Product.add() creates a product with required fields', () => {
    const Product = require('../models/Product');
    const p = Product.add({ name: 'Test Shirt', price: 19.99, category: 'clothing', type: 'shirt' });
    expect(p.id).toBeDefined();
    expect(p.name).toBe('Test Shirt');
    expect(p.price).toBe(19.99);
    expect(p.category).toBe('clothing');
  });

  test('Product.add() throws if name is missing', () => {
    const Product = require('../models/Product');
    expect(() => Product.add({ price: 10 })).toThrow('Name and price are required.');
  });

  test('Product.add() throws if price is missing', () => {
    const Product = require('../models/Product');
    expect(() => Product.add({ name: 'No Price' })).toThrow('Name and price are required.');
  });

  test('Product.getById() returns correct product', () => {
    const Product = require('../models/Product');
    const added = Product.add({ name: 'Cap', price: 9.99 });
    const found = Product.getById(added.id);
    expect(found.name).toBe('Cap');
  });

  test('Product.update() updates fields correctly', () => {
    const Product = require('../models/Product');
    const added = Product.add({ name: 'Old Name', price: 5.00 });
    const updated = Product.update(added.id, { name: 'New Name', price: 7.50 });
    expect(updated.name).toBe('New Name');
    expect(updated.price).toBe(7.50);
    expect(updated.updatedAt).toBeDefined();
  });

  test('Product.update() throws if product not found', () => {
    const Product = require('../models/Product');
    expect(() => Product.update(99999, { name: 'X' })).toThrow('Product not found.');
  });

  test('Product.delete() removes product', () => {
    const Product = require('../models/Product');
    const added = Product.add({ name: 'Delete Me', price: 1.00 });
    Product.delete(added.id);
    expect(Product.getById(added.id)).toBeUndefined();
  });

  test('Product.delete() throws if product not found', () => {
    const Product = require('../models/Product');
    expect(() => Product.delete(99999)).toThrow('Product not found.');
  });

  test('Product.getAll() returns all products', () => {
    const Product = require('../models/Product');
    Product.add({ name: 'A', price: 1 });
    Product.add({ name: 'B', price: 2 });
    expect(Product.getAll().length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────

describe('Staff middleware - requireStaff', () => {
  const { requireStaff } = require('../middleware/requiredStaff');

  test('redirects to login if not logged in', () => {
    const req = { session: {} };
    const res = { redirect: jest.fn() };
    const next = jest.fn();
    requireStaff(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/login?error=1');
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 if user is customer', () => {
    const req = { session: { user: { role: 'customer' } } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();
    requireStaff(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next() if user is staff', () => {
    const req = { session: { user: { role: 'staff' } } };
    const res = {};
    const next = jest.fn();
    requireStaff(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────

describe('Staff createOrder flow', () => {
  let origAccounts, origOrders, origProducts;

  beforeEach(() => {
    origAccounts = backup(ACCOUNTS_FILE);
    origOrders   = backup(ORDERS_FILE);
    origProducts = backup(PRODUCTS_FILE);

    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify([
      { id: 1, name: 'Alice', email: 'alice@test.com', address: '123 St', role: 'customer', passwordHash: 'x' },
    ]));
    fs.writeFileSync(ORDERS_FILE,   JSON.stringify([]));
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([]));
    jest.resetModules();
  });

  afterEach(() => {
    restore(ACCOUNTS_FILE, origAccounts);
    restore(ORDERS_FILE,   origOrders);
    restore(PRODUCTS_FILE, origProducts);
  });

  test('createOrder places an order for a customer', () => {
    const Product = require('../models/Product');
    const Order   = require('../models/Order');

    const p = Product.add({ name: 'Hoodie', price: 40.00 });

    const req = {
      session: { user: { id: 99, role: 'staff' }, cart: {} },
      headers: {},
      body: {
        customerId:  '1',
        productIds:  [String(p.id)],
        quantities:  ['2'],
        address:     '456 Ave',
      },
    };
    const res = { redirect: jest.fn(), render: jest.fn() };

    jest.resetModules();
    const staffCtrl = require('../controllers/staffController');
    staffCtrl.createOrder(req, res);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/staff/orders?success=1'));
    const orders = Order.getAll();
    expect(orders.length).toBe(1);
    expect(orders[0].userId).toBe(1);
    expect(orders[0].total).toBe(+(40 * 2 * 1.08).toFixed(2));
  });

  test('createOrder renders error if customer not found', () => {
    const req = {
      session: { user: { id: 99, role: 'staff' }, cart: {} },
      headers: {},
      body: { customerId: '999', productIds: ['1'], quantities: ['1'], address: '' },
    };
    const res = { redirect: jest.fn(), render: jest.fn() };

    jest.resetModules();
    const staffCtrl = require('../controllers/staffController');
    staffCtrl.createOrder(req, res);

    expect(res.render).toHaveBeenCalledWith('staff/order-form', expect.objectContaining({
      error: 'Customer not found.',
    }));
  });
});