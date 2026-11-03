/**
 * Usage: npm run seed
 *
 * Fills the database with the sample catalog, an admin account, a demo
 * customer and a few sample orders. Safe to run more than once: categories
 * and products are upserted by slug, users by email, and sample orders are
 * only created when the orders table is empty.
 */
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const {
  withTransaction,
  closePool,
  categoryRepository,
  productRepository,
  userRepository,
  orderRepository,
} = require('../src/data');
const { calculateShippingCents } = require('../src/models');
const catalog = require('./seed-data/catalog');

const DEMO_CUSTOMER = {
  name: 'Jordan Ellis',
  email: 'customer@example.com',
  password: 'Customer123!',
};

async function seedCatalog() {
  const productsBySlug = {};
  await withTransaction(async (tx) => {
    const categoryIds = {};
    for (const category of catalog.categories) {
      const row = await categoryRepository.upsert(category, tx);
      categoryIds[category.slug] = row.id;
    }
    for (const product of catalog.products) {
      const row = await productRepository.upsert({ ...product, categoryId: categoryIds[product.category] }, tx);
      productsBySlug[product.slug] = row;
    }
  });
  console.log(`[seed] ${catalog.categories.length} categories, ${catalog.products.length} products`);
  return productsBySlug;
}

async function seedUsers() {
  config.assertRequired([
    ['ADMIN_EMAIL', config.admin.email],
    ['ADMIN_PASSWORD', config.admin.password],
  ]);
  const rounds = config.auth.bcryptRounds;

  const admin = await userRepository.upsertByEmail({
    name: config.admin.name,
    email: config.admin.email.toLowerCase(),
    passwordHash: await bcrypt.hash(config.admin.password, rounds),
    role: 'admin',
  });
  const customer = await userRepository.upsertByEmail({
    name: DEMO_CUSTOMER.name,
    email: DEMO_CUSTOMER.email,
    passwordHash: await bcrypt.hash(DEMO_CUSTOMER.password, rounds),
    role: 'customer',
  });
  console.log(`[seed] admin user: ${admin.email}`);
  console.log(`[seed] demo customer: ${customer.email} / ${DEMO_CUSTOMER.password}`);
  return customer;
}

/** A handful of historical orders so the admin page has data to show. */
async function seedSampleOrders(customer, productsBySlug) {
  const existing = await orderRepository.findMany({ limit: 1, offset: 0 });
  if (existing.total > 0) {
    console.log('[seed] orders already exist, skipping sample orders');
    return;
  }

  const samples = [
    { daysAgo: 12, status: 'delivered', customer, lines: [['wireless-over-ear-headphones', 1]] },
    { daysAgo: 6, status: 'shipped', customer, lines: [['organic-cotton-crew-tee', 3], ['slim-leather-wallet', 1]] },
    {
      daysAgo: 4, status: 'confirmed', lines: [['stoneware-mug-set', 2], ['ceramic-table-lamp', 1]],
      guest: { name: 'Amelia Novak', email: 'amelia.novak@example.com' },
    },
    {
      daysAgo: 2, status: 'cancelled', lines: [['everyday-leather-sneaker', 1]],
      guest: { name: 'Daniel Okafor', email: 'daniel.okafor@example.com' },
    },
    {
      daysAgo: 1, status: 'pending', lines: [['minimalist-analog-watch', 1], ['classic-acetate-sunglasses', 1]],
      guest: { name: 'Sofia Martins', email: 'sofia.martins@example.com' },
    },
    { daysAgo: 0, status: 'pending', customer, lines: [['heavyweight-fleece-hoodie', 1], ['canvas-low-top', 1]] },
  ];

  await withTransaction(async (tx) => {
    for (const [index, sample] of samples.entries()) {
      const items = sample.lines.map(([slug, quantity]) => {
        const product = productsBySlug[slug];
        return {
          productId: product.id,
          productName: product.name,
          productImageUrl: product.image_url,
          unitPriceCents: product.price_cents,
          quantity,
          lineTotalCents: product.price_cents * quantity,
        };
      });
      const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
      const shippingCents = calculateShippingCents(subtotalCents);
      const person = sample.customer || sample.guest;

      const order = await orderRepository.insertOrder(
        {
          orderNumber: `SF-SEED-${String(index + 1).padStart(3, '0')}`,
          userId: sample.customer ? sample.customer.id : null,
          customerName: person.name,
          customerEmail: person.email,
          shippingAddress: { line1: '24 Market Street', city: 'Portland', postalCode: '97205', country: 'United States' },
          status: sample.status,
          subtotalCents,
          shippingCents,
          totalCents: subtotalCents + shippingCents,
        },
        tx,
      );
      await orderRepository.insertOrderItems(order.id, items, tx);
      // Backdate the sample so the list looks like real history.
      await orderRepository.backdate(order.id, sample.daysAgo, tx);
    }
  });
  console.log(`[seed] ${samples.length} sample orders`);
}

async function main() {
  const productsBySlug = await seedCatalog();
  const customer = await seedUsers();
  await seedSampleOrders(customer, productsBySlug);
}

main()
  .then(() => closePool())
  .catch(async (error) => {
    console.error('[seed] failed:', error.message);
    await closePool();
    process.exit(1);
  });
