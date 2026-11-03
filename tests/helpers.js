/**
 * Shared test setup.
 *
 * The tests use a REAL PostgreSQL database (TEST_DATABASE_URL), which is
 * wiped and re-migrated before each test file. Never point it at a database
 * whose data you want to keep.
 */
process.env.NODE_ENV = 'test';

const bcrypt = require('bcryptjs');
const config = require('../src/config');
const db = require('../src/data/db');
const { runMigrations, resetDatabase } = require('../src/data/migrator');
const { categoryRepository, productRepository, userRepository } = require('../src/data');

if (!config.database.url) {
  throw new Error('Set TEST_DATABASE_URL (or DATABASE_URL) to run the tests');
}
config.auth.jwtSecret = config.auth.jwtSecret || 'test-secret';

const PASSWORDS = { admin: 'AdminPass123!', customer: 'CustomerPass123!' };

/** Drops all tables, re-runs migrations and inserts a small catalog + users. */
async function resetAndSeed() {
  await resetDatabase();
  await runMigrations({ log: () => {} });

  const apparel = await categoryRepository.upsert({ slug: 'apparel', name: 'Apparel', description: 'Clothes', imageUrl: 'https://example.com/a.jpg' });
  const home = await categoryRepository.upsert({ slug: 'home', name: 'Home', description: 'Home goods', imageUrl: 'https://example.com/h.jpg' });

  const product = (overrides) => productRepository.upsert({
    description: 'A test product', imageUrl: 'https://example.com/p.jpg', rating: 4.5, reviewCount: 10, isFeatured: false, ...overrides,
  });

  const products = {
    tee: await product({ categoryId: apparel.id, name: 'Cotton Tee', slug: 'cotton-tee', priceCents: 2500, stock: 10, isFeatured: true, rating: 4.2 }),
    hoodie: await product({ categoryId: apparel.id, name: 'Fleece Hoodie', slug: 'fleece-hoodie', priceCents: 8000, stock: 2, rating: 4.8 }),
    mug: await product({ categoryId: home.id, name: 'Stoneware Mug', slug: 'stoneware-mug', priceCents: 1200, stock: 0, rating: 3.9 }),
    lamp: await product({ categoryId: home.id, name: 'Table Lamp', slug: 'table-lamp', priceCents: 12000, stock: 5, rating: 4.5 }),
  };

  const admin = await userRepository.create({
    name: 'Admin', email: 'admin@test.local', passwordHash: await bcrypt.hash(PASSWORDS.admin, 4), role: 'admin',
  });
  const customer = await userRepository.create({
    name: 'Casey Customer', email: 'casey@test.local', passwordHash: await bcrypt.hash(PASSWORDS.customer, 4), role: 'customer',
  });
  const otherCustomer = await userRepository.create({
    name: 'Other Customer', email: 'other@test.local', passwordHash: await bcrypt.hash(PASSWORDS.customer, 4), role: 'customer',
  });

  return { products, users: { admin, customer, otherCustomer } };
}

function orderInput(items, overrides = {}) {
  return {
    customerName: 'Casey Customer',
    customerEmail: 'casey@test.local',
    shippingAddress: { line1: '1 Test Street', city: 'Testville', postalCode: '12345', country: 'United States' },
    items,
    ...overrides,
  };
}

/** Raw SQL for assertions only — application code never does this outside the data layer. */
async function sql(text, params) {
  const { rows } = await db.query(text, params);
  return rows;
}

module.exports = { resetAndSeed, orderInput, sql, closePool: db.closePool, PASSWORDS, config };
