const { Client } = require('pg');

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Create tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      company TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      price_cents INT NOT NULL,
      category TEXT,
      in_stock BOOLEAN DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_id INT REFERENCES customers(id),
      status TEXT NOT NULL DEFAULT 'pending',
      total_cents INT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INT REFERENCES orders(id),
      product_id INT REFERENCES products(id),
      quantity INT NOT NULL,
      unit_price_cents INT NOT NULL
    );
  `);

  // Seed customers
  await client.query(`
    INSERT INTO customers (name, email, company) VALUES
      ('Alice Johnson', 'alice@acmecorp.com', 'Acme Corp'),
      ('Bob Smith', 'bob@globex.com', 'Globex Inc'),
      ('Carol Williams', 'carol@initech.com', 'Initech'),
      ('Dave Brown', 'dave@umbrella.com', 'Umbrella LLC'),
      ('Eve Davis', 'eve@wayneent.com', 'Wayne Enterprises')
    ON CONFLICT (email) DO NOTHING;
  `);

  // Seed products
  await client.query(`
    INSERT INTO products (name, sku, price_cents, category, in_stock) VALUES
      ('Wireless Keyboard', 'KB-WIRELESS-01', 7999, 'peripherals', true),
      ('USB-C Hub 7-in-1', 'HUB-USBC-07', 4999, 'peripherals', true),
      ('27" 4K Monitor', 'MON-4K-27', 34999, 'displays', true),
      ('Ergonomic Mouse', 'MS-ERGO-01', 5999, 'peripherals', true),
      ('Standing Desk Mat', 'MAT-STAND-01', 3999, 'furniture', false),
      ('Noise Cancelling Headset', 'HS-NC-PRO', 14999, 'audio', true),
      ('Webcam 1080p', 'CAM-1080-01', 8999, 'peripherals', true),
      ('Laptop Stand', 'STAND-LAP-01', 4499, 'furniture', true)
    ON CONFLICT (sku) DO NOTHING;
  `);

  // Seed orders
  await client.query(`
    INSERT INTO orders (customer_id, status, total_cents, created_at) VALUES
      (1, 'completed', 12998, '2026-02-15 10:30:00'),
      (2, 'completed', 34999, '2026-02-18 14:00:00'),
      (3, 'shipped', 20998, '2026-03-01 09:15:00'),
      (1, 'pending', 14999, '2026-03-05 16:45:00'),
      (4, 'completed', 8998, '2026-03-07 11:20:00'),
      (5, 'pending', 49498, '2026-03-08 08:00:00')
    ON CONFLICT DO NOTHING;
  `);

  // Seed order items
  await client.query(`
    INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES
      (1, 1, 1, 7999),
      (1, 2, 1, 4999),
      (2, 3, 1, 34999),
      (3, 4, 1, 5999),
      (3, 6, 1, 14999),
      (4, 6, 1, 14999),
      (5, 7, 1, 8999),
      (6, 3, 1, 34999),
      (6, 6, 1, 14999)
    ON CONFLICT DO NOTHING;
  `);

  const counts = {};
  for (const table of ['customers', 'products', 'orders', 'order_items']) {
    const r = await client.query(`SELECT count(*) FROM ${table}`);
    counts[table] = parseInt(r.rows[0].count);
  }
  console.log('Seeded production_orders:', counts);

  await client.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
