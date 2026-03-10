const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('azure') ? { rejectUnauthorized: false } : false,
});

app.get('/', async (req, res) => {
  try {
    const customers = await pool.query('SELECT count(*) FROM customers');
    const orders = await pool.query('SELECT count(*) FROM orders');
    const products = await pool.query('SELECT count(*) FROM products');

    res.json({
      app: 'embr-direct-db-app',
      mode: 'direct-connection',
      database: process.env.DATABASE_URL ? 'connected' : 'missing DATABASE_URL',
      counts: {
        customers: parseInt(customers.rows[0].count),
        orders: parseInt(orders.rows[0].count),
        products: parseInt(products.rows[0].count),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, company, created_at FROM customers ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, sku, price_cents, category, in_stock FROM products ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, c.name as customer, o.status, o.total_cents, o.created_at,
             json_agg(json_build_object('product', p.name, 'quantity', oi.quantity, 'unit_price', oi.unit_price_cents)) as items
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      GROUP BY o.id, c.name
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', database: err.message });
  }
});

app.listen(port, () => {
  console.log(`Production orders app listening on port ${port}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '***connected***' : 'NOT SET'}`);
});
