'use strict';
const express    = require('express');
const router     = express.Router();
const shopCtrl   = require('../controllers/shopController');
const authCtrl   = require('../controllers/authController');
const staffCtrl  = require('../controllers/staffController');
const { requireStaff } = require('../middleware/requireStaff');

// ── Shop ──────────────────────────────────────────────────────
router.get('/',             shopCtrl.showShop);
router.post('/cart/add',    shopCtrl.addToCart);
router.get('/cart',         shopCtrl.showCart);
router.post('/cart/update', shopCtrl.updateCart);
router.post('/cart/remove', shopCtrl.removeFromCart);
router.post('/cart/clear',  shopCtrl.clearCart);

// ── Checkout & Orders (login required) ───────────────────────
router.get ('/checkout', authCtrl.requireLogin, shopCtrl.showCheckout);
router.post('/checkout', authCtrl.requireLogin, shopCtrl.placeOrder);
router.get ('/orders',   authCtrl.requireLogin, shopCtrl.showOrderHistory);

// ── Auth ──────────────────────────────────────────────────────
router.get ('/login',    authCtrl.showLogin);
router.post('/login',    authCtrl.login);
router.get ('/logout',   authCtrl.logout);
router.get ('/register', authCtrl.showRegister);
router.post('/register', authCtrl.register);
router.get ('/profile',  authCtrl.requireLogin, authCtrl.showProfile);

// ── Staff (role: staff only) ──────────────────────────────────
router.get ('/staff',                      requireStaff, staffCtrl.dashboard);

// Products CRUD
router.get ('/staff/products',             requireStaff, staffCtrl.listProducts);
router.get ('/staff/products/new',         requireStaff, staffCtrl.showAddProduct);
router.post('/staff/products',             requireStaff, staffCtrl.addProduct);
router.get ('/staff/products/:id/edit',    requireStaff, staffCtrl.showEditProduct);
router.post('/staff/products/:id/edit',    requireStaff, staffCtrl.editProduct);
router.post('/staff/products/:id/delete',  requireStaff, staffCtrl.deleteProduct);

// Orders
router.get ('/staff/orders',               requireStaff, staffCtrl.listOrders);
router.get ('/staff/orders/new',           requireStaff, staffCtrl.showCreateOrder);
router.post('/staff/orders',               requireStaff, staffCtrl.createOrder);

module.exports = router;