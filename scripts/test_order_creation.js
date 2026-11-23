import '../src/DB/models/associations.js';
import { sequelize } from '../src/DB/DBConnection.js';
import User, { RoleEnum } from '../src/DB/models/User.js';
import Restaurant from '../src/DB/models/Restaurant.js';
import Dish from '../src/DB/models/Dish.js';
import Cart from '../src/DB/models/Cart.js';
import Order from '../src/DB/models/Order.js';
import OrderItems from '../src/DB/models/OrderItems.js';
import RestaurantOrder from '../src/DB/models/RestaurantOrder.js';
import { generateTokens } from '../src/utils/token.js';
import app from '../src/app.controller.js';
import http from 'http';

async function runEndToEndOrderTest() {
  console.log('🧪 Starting End-to-End Order Creation Test...');

  // 1. Find or verify customer user
  let user = await User.findOne({ where: { role: RoleEnum.CUSTOMER, isVerified: true } });
  if (!user) {
    user = await User.findOne({ where: { role: RoleEnum.CUSTOMER } });
    if (user) {
      await user.update({ isVerified: true });
    }
  }
  if (!user) {
    user = await User.findOne();
  }
  if (!user) {
    throw new Error('No user found in database for test.');
  }
  console.log(`👤 Using test user ID: ${user.id} (${user.email})`);

  // 2. Find a dish and restaurant
  const dish = await Dish.findOne({ where: { is_available: true } });
  if (!dish) {
    throw new Error('No available dish found in database.');
  }
  console.log(`🍲 Using test dish ID: ${dish.id} ("${dish.name}", price: ${dish.price}, restaurant_id: ${dish.restaurant_id})`);

  // 3. Put dish in cart for this user
  await Cart.destroy({ where: { user_id: user.id } });
  const cartItem = await Cart.create({
    user_id: user.id,
    dish_id: dish.id,
    quantity: 2,
    price_at_moment: Number(dish.price) * 2,
  });
  console.log(`🛒 Added dish to cart for user ${user.id} (Cart Item ID: ${cartItem.id})`);

  // 4. Generate JWT auth token
  const { accessToken } = generateTokens(user);

  // 5. Start ephemeral test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`🌐 Test server listening on ${baseUrl}`);

  try {
    // 6. Test POST /order
    console.log('🚀 Sending POST /order ...');
    const orderPayload = {
      address: '123 Test Boulevard, Building 4, Apt 10',
      special_instructions: 'Handle with care - automated test',
    };

    const authHeader = `${process.env.customersPrefix} ${accessToken}`;

    const postRes = await fetch(`${baseUrl}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(orderPayload),
    });

    const postData = await postRes.json();
    console.log('POST /order response status:', postRes.status);
    console.log('POST /order response body:', JSON.stringify(postData, null, 2));

    if (postRes.status !== 201) {
      throw new Error(`POST /order failed with status ${postRes.status}: ${JSON.stringify(postData)}`);
    }

    const createdOrderId = postData.order?.id;
    console.log(`✅ Order created successfully! Order ID: ${createdOrderId}`);

    // 7. Verify records in DB directly
    const dbOrder = await Order.findByPk(createdOrderId, {
      include: [
        {
          model: RestaurantOrder,
          as: 'restaurant_orders',
          include: [{ model: Restaurant, as: 'restaurant_details' }],
        },
        {
          model: OrderItems,
          as: 'order_items',
        },
      ],
    });

    console.log(`🔍 DB Verification for Order #${createdOrderId}:`);
    console.log(`   - Total amount: $${dbOrder.total_amount}`);
    console.log(`   - Status: ${dbOrder.status}`);
    console.log(`   - Sub-orders (restaurantorders): ${dbOrder.restaurant_orders.length}`);
    dbOrder.restaurant_orders.forEach((ro) => {
      console.log(`     * RestaurantOrder ID #${ro.id}, restaurant_id: ${ro.restaurant_id}, amount: $${ro.total_amount}`);
    });
    console.log(`   - Order Items: ${dbOrder.order_items.length}`);
    dbOrder.order_items.forEach((oi) => {
      console.log(`     * OrderItem ID #${oi.id}: "${oi.dish_name}", qty: ${oi.quantity}, restaurant_id: ${oi.restaurant_id}, restaurant_order_id: ${oi.restaurant_order_id}`);
    });

    if (dbOrder.order_items.length === 0) {
      throw new Error('Order items were not created!');
    }
    if (dbOrder.restaurant_orders.length === 0) {
      throw new Error('Restaurant orders were not created!');
    }

    // 8. Test GET /order/:id
    console.log(`🚀 Sending GET /order/${createdOrderId} ...`);
    const getRes = await fetch(`${baseUrl}/order/${createdOrderId}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    const getData = await getRes.json();
    console.log(`GET /order/${createdOrderId} response status:`, getRes.status);
    if (getRes.status !== 200) {
      throw new Error(`GET /order/${createdOrderId} failed with status ${getRes.status}`);
    }
    console.log(`✅ GET /order/${createdOrderId} succeeded!`);

    // 9. Test GET /order/me
    console.log(`🚀 Sending GET /order/me ...`);
    const meRes = await fetch(`${baseUrl}/order/me`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });
    const meData = await meRes.json();
    console.log(`GET /order/me response status:`, meRes.status);
    if (meRes.status !== 200) {
      throw new Error(`GET /order/me failed with status ${meRes.status}`);
    }
    console.log(`✅ GET /order/me succeeded! Found ${meData.orders?.length || 0} orders.`);

    // 10. Clean up test order
    console.log('🧹 Cleaning up test order...');
    await Order.destroy({ where: { id: createdOrderId } });
    console.log('✅ Cleaned up test order.');

    console.log('\n🎉 ALL TESTS PASSED! POST /order AND GET /order SUCCEED WITH ZERO ERRORS!');
  } finally {
    server.close();
    await sequelize.close();
  }

  process.exit(0);
}

runEndToEndOrderTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
