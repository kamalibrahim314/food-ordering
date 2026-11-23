import { sequelize } from '../src/DB/DBConnection.js';

async function migrate() {
  console.log('--- Migrating order_items foreign keys ---');

  // 1. Drop existing misconfigured constraint order_items_ibfk_2
  try {
    console.log('Dropping misconfigured foreign key order_items_ibfk_2...');
    await sequelize.query('ALTER TABLE order_items DROP FOREIGN KEY order_items_ibfk_2;');
    console.log('✅ Dropped order_items_ibfk_2 successfully.');
  } catch (err) {
    console.warn('Notice dropping order_items_ibfk_2:', err.message);
  }

  // 2. Add correct foreign key pointing restaurant_id to restaurants (id)
  try {
    console.log('Adding correct foreign key order_items_ibfk_2 pointing to restaurants(id)...');
    await sequelize.query(
      'ALTER TABLE order_items ADD CONSTRAINT order_items_ibfk_2 FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE ON UPDATE CASCADE;'
    );
    console.log('✅ Added correct foreign key constraint successfully.');
  } catch (err) {
    console.error('Error adding foreign key:', err.message);
    process.exit(1);
  }

  // 3. Verify SHOW CREATE TABLE order_items
  const [res] = await sequelize.query('SHOW CREATE TABLE order_items;');
  console.log('=== Updated order_items schema ===\n', res[0]['Create Table']);

  await sequelize.close();
  console.log('🎉 Foreign key migration completed successfully!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
