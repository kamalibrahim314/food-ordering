import '../src/DB/models/associations.js';
import { sequelize } from '../src/DB/DBConnection.js';
import User from '../src/DB/models/User.js';
import RevokedToken from '../src/DB/models/RevokedToken.js';
import Category from '../src/DB/models/Category.js';
import Cart from '../src/DB/models/Cart.js';
import Dish from '../src/DB/models/Dish.js';
import Order from '../src/DB/models/Order.js';
import OrderItems from '../src/DB/models/OrderItems.js';
import Restaurant from '../src/DB/models/Restaurant.js';
import Review from '../src/DB/models/Review.js';
import RestaurantOrder from '../src/DB/models/RestaurantOrder.js';

async function verifyAllModels() {
  console.log('Testing connection and models against Aiven MySQL...');

  const models = [
    { name: 'User', model: User },
    { name: 'RevokedToken', model: RevokedToken },
    { name: 'Category', model: Category },
    { name: 'Cart', model: Cart },
    { name: 'Dish', model: Dish },
    { name: 'Order', model: Order },
    { name: 'OrderItems', model: OrderItems },
    { name: 'Restaurant', model: Restaurant },
    { name: 'Review', model: Review },
    { name: 'RestaurantOrder', model: RestaurantOrder }
  ];

  for (const { name, model } of models) {
    try {
      await model.findOne({ limit: 1 });
      console.log(`✅ ${name} (table: "${model.tableName}") -> query succeeded`);
    } catch (err) {
      console.error(`❌ ${name} (table: "${model.tableName}") -> FAILED:`, err.message);
      process.exit(1);
    }
  }

  // Test the exact failing association query: Order include RestaurantOrder & OrderItems
  try {
    await Order.findOne({
      include: [
        {
          model: RestaurantOrder,
          as: 'restaurant_orders',
          include: [{ model: Restaurant, as: 'restaurant_details' }]
        },
        {
          model: OrderItems,
          as: 'order_items'
        }
      ]
    });
    console.log(`✅ Order with RestaurantOrder & OrderItems association query succeeded!`);
  } catch (err) {
    console.error(`❌ Order association query FAILED:`, err.message);
    process.exit(1);
  }

  await sequelize.close();
  console.log('🎉 ALL MODELS AND ASSOCIATIONS VERIFIED SUCCESSFULLY AGAINST AIVEN MYSQL!');
  process.exit(0);
}

verifyAllModels();
