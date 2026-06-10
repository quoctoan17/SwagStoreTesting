'use strict';

const Product = require('../models/Product');
const Account = require('../models/Account');
const Order   = require('../models/Order');
const Cart    = require('../models/Cart');

function getCart(req) {
  return new Cart(req.session.cart || {});
}

// GET /staff
exports.dashboard = (req, res) => {
  const cart = getCart(req);
  res.render('staff/dashboard', {
    productCount: Product.getAll().length,
    orderCount:   Order.count(),
    revenue:      Order.totalRevenue(),
    cartCount:    cart.count,
  });
};

// ── PRODUCT CRUD ─────────────────────────────────────────────

// GET /staff/products
exports.listProducts = (req, res) => {
  const cart = getCart(req);
  res.render('staff/products', {
    products:   Product.getAll(),
    categories: Product.getCategories(),
    types:      Product.getTypes(),
    cartCount:  cart.count,
    success:    req.query.success || null,
  });
};

// GET /staff/products/new
exports.showAddProduct = (req, res) => {
  const cart = getCart(req);
  res.render('staff/product-form', {
    categories: Product.getCategories(),
    types:      Product.getTypes(),
    cartCount:  cart.count,
    isNew:      true,
  });
};

// POST /staff/products
exports.addProduct = (req, res) => {
  const cart = getCart(req);
  try {
    Product.add(req.body);
    res.redirect('/staff/products?success=added');
  } catch (err) {
    res.render('staff/product-form', {
      error:      err.message,
      form:       req.body,
      categories: Product.getCategories(),
      types:      Product.getTypes(),
      cartCount:  cart.count,
      isNew:      true,
    });
  }
};

// GET /staff/products/:id/edit
exports.showEditProduct = (req, res) => {
  const cart = getCart(req);
  const product = Product.getById(req.params.id);
  if (!product) return res.status(404).send('Product not found.');
  res.render('staff/product-form', {
    product,
    categories: Product.getCategories(),
    types:      Product.getTypes(),
    cartCount:  cart.count,
    isNew:      false,
  });
};

// POST /staff/products/:id/edit
exports.editProduct = (req, res) => {
  const cart = getCart(req);
  try {
    Product.update(req.params.id, req.body);
    res.redirect('/staff/products?success=updated');
  } catch (err) {
    res.render('staff/product-form', {
      error:      err.message,
      form:       req.body,
      categories: Product.getCategories(),
      types:      Product.getTypes(),
      cartCount:  cart.count,
      isNew:      false,
    });
  }
};

// POST /staff/products/:id/delete
exports.deleteProduct = (req, res) => {
  try {
    Product.delete(req.params.id);
    res.redirect('/staff/products?success=deleted');
  } catch (err) {
    res.redirect('/staff/products?error=' + encodeURIComponent(err.message));
  }
};

// ── ORDER FOR CUSTOMER ───────────────────────────────────────

// GET /staff/orders/new
exports.showCreateOrder = (req, res) => {
  const cart = getCart(req);
  const customers = Account.getAll().filter(a => a.role === 'customer');
  res.render('staff/order-form', {
    customers,
    products:  Product.getAll(),
    cartCount: cart.count,
  });
};

// POST /staff/orders
exports.createOrder = (req, res) => {
  const cart = getCart(req);
  try {
    const { customerId, productIds, quantities, address } = req.body;
    const customer = Account.findById(customerId);
    if (!customer) throw new Error('Customer not found.');

    const ids  = Array.isArray(productIds)  ? productIds  : [productIds];
    const qtys = Array.isArray(quantities)  ? quantities  : [quantities];

    const items = ids.map((pid, i) => {
      const product = Product.getById(pid);
      if (!product) throw new Error(`Product ${pid} not found.`);
      const qty = Number(qtys[i]) || 1;
      return { product, qty, subtotal: +(product.price * qty).toFixed(2) };
    });

    const subtotal = +items.reduce((s, l) => s + l.subtotal, 0).toFixed(2);
    const tax      = +(subtotal * 0.08).toFixed(2);
    const total    = +(subtotal + tax).toFixed(2);

    const order = Order.add({
      id:         'ORD-' + Date.now(),
      userId:     customer.id,
      email:      customer.email,
      name:       customer.name,
      address:    address || customer.address,
      items,
      subtotal,
      tax,
      total,
      placedBy:   req.session.user.id,  // staff id
      placedAt:   new Date().toLocaleString('vi-VN'),
    });

    res.redirect('/staff/orders?success=1&orderId=' + order.id);
  } catch (err) {
    const customers = Account.getAll().filter(a => a.role === 'customer');
    res.render('staff/order-form', {
      error:     err.message,
      customers,
      products:  Product.getAll(),
      cartCount: cart.count,
    });
  }
};

// GET /staff/orders
exports.listOrders = (req, res) => {
  const cart = getCart(req);
  res.render('staff/orders', {
    orders:    Order.getAll(),
    cartCount: cart.count,
    success:   req.query.success ? `Order ${req.query.orderId} created.` : null,
  });
};