'use strict';

const fs       = require('fs');
const path     = require('path');
const Category = require('./Category');

const dataFile = path.join(__dirname, '..', 'data', 'products.json');
const typesFile = path.join(__dirname, '..', 'data', 'types.json');

function readProducts() {
  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function writeProducts(products) {
  fs.writeFileSync(dataFile, JSON.stringify(products, null, 2));
}

class Product {
  static getAll()    { return readProducts(); }
  static getById(id) { return readProducts().find(p => String(p.id) === String(id)); }

  static getCategories() { return Category.getAll(); }
  static getTypes() {
    try { return JSON.parse(fs.readFileSync(typesFile, 'utf8')); }
    catch (_) { return []; }
  }

  static add({ name, price, category, type, badge, image, description }) {
    if (!name || !price) throw new Error('Name and price are required.');
    const products = readProducts();
    const newProduct = {
      id:          Date.now(),
      name:        String(name).trim(),
      price:       +Number(price).toFixed(2),
      category:    category || '',
      type:        type     || '',
      badge:       badge    || '',
      image:       image    || '',
      description: description || '',
      createdAt:   new Date().toISOString(),
    };
    products.push(newProduct);
    writeProducts(products);
    return newProduct;
  }

  static update(id, fields) {
    const products = readProducts();
    const idx = products.findIndex(p => String(p.id) === String(id));
    if (idx === -1) throw new Error('Product not found.');
    if (fields.price !== undefined) fields.price = +Number(fields.price).toFixed(2);
    products[idx] = { ...products[idx], ...fields, updatedAt: new Date().toISOString() };
    writeProducts(products);
    return products[idx];
  }

  static delete(id) {
    const products = readProducts();
    const idx = products.findIndex(p => String(p.id) === String(id));
    if (idx === -1) throw new Error('Product not found.');
    const deleted = products.splice(idx, 1)[0];
    writeProducts(products);
    return deleted;
  }
}

module.exports = Product;