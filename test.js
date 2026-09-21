// Quick connectivity test — run with:  node test.js
const { graphql, rest } = require('./shopify');

(async () => {
  // 1. GraphQL: shop info
  const shop = await graphql(`{ shop { name email } }`);
  console.log('✅ Connected to:', shop.shop.name, `(${shop.shop.email})`);

  // 2. GraphQL: first few products
  const { products } = await graphql(`{ products(first: 3) { nodes { id title } } }`);
  console.log(`\n📦 Products (${products.nodes.length}):`);
  for (const p of products.nodes) console.log('  -', p.title);

  // 3. REST: order count
  const orders = await rest('orders/count.json');
  console.log(`\n🧾 Order count (REST):`, orders.count || 0);
})().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});