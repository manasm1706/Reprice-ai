const express = require("express");
const router = express.Router();

const { pool } = require("../db");
const { authenticateToken } = require("../middleware/authMiddleware");

router.post("/create", authenticateToken, async (req, res) => {
  try {
    const {
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      phone,
      pickupDate,
      timeSlot,
      paymentMethod,
    } = req.body;

    console.log('Received timeSlot:', timeSlot);

    if (latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: "Location access is required to place the order",
      });
    }

    const customerId = req.user.id;

    const addressResult = await pool.query(
      `INSERT INTO customer_addresses
       (customer_id, full_address, city, state, pincode, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [customerId, address, city, state || '', pincode, latitude, longitude]
    );

    const addressId = addressResult.rows[0].id;

    // ✅ ADD: Generate order number
    const orderNumber = `MOB${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // ✅ UPDATED: include order_number column & value
    const orderResult = await pool.query(
      `INSERT INTO orders
       (customer_id, address_id, phone_model, phone_variant, phone_condition,
        price, pickup_date, payment_method, time_slot, order_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        customerId,
        addressId,
        phone.name,
        phone.variant,
        phone.condition,
        phone.price,
        pickupDate,
        paymentMethod,
        timeSlot,
        orderNumber, // ✅ added
      ]
    );

    console.log('Created order:', orderResult.rows[0]);

    res.status(201).json({
      success: true,
      order: orderResult.rows[0],
    });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    console.error("Request body:", req.body);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

// ASSIGN ORDER TO AGENT (Start Pickup)
router.patch("/:id/assign", authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const agentId = req.user.id;

    const result = await pool.query(
      `
      UPDATE orders
      SET status = 'in-progress', agent_id = $1
      WHERE id = $2 AND status = 'pending' AND agent_id IS NULL
      RETURNING *
      `,
      [agentId, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "Order already assigned or not available",
      });
    }

    res.json({
      success: true,
      order: result.rows[0],
    });
  } catch (err) {
    console.error("ASSIGN ORDER ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// GET SINGLE ORDER DETAILS
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    const userType = req.user.userType;

    let query;
    let params;

    if (userType === "customer") {
      query = `
        SELECT 
          o.*,
          c.name AS customer_name,
          c.phone AS customer_phone,
          c.email AS customer_email,
          ca.full_address,
          ca.city,
          ca.state,
          ca.pincode,
          a.name AS agent_name,
          a.phone AS agent_phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN customer_addresses ca ON o.address_id = ca.id
        LEFT JOIN agents a ON o.agent_id = a.id
        WHERE o.id = $1 AND o.customer_id = $2
      `;
      params = [orderId, userId];
    } else if (userType === "agent") {
      query = `
        SELECT 
          o.*,
          c.name AS customer_name,
          c.phone AS customer_phone,
          c.email AS customer_email,
          ca.full_address,
          ca.city,
          ca.state,
          ca.pincode,
          a.name AS agent_name,
          a.phone AS agent_phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN customer_addresses ca ON o.address_id = ca.id
        LEFT JOIN agents a ON o.agent_id = a.id
        WHERE o.id = $1 AND (o.agent_id = $2 OR o.status = 'pending')
      `;
      params = [orderId, userId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      order: result.rows[0],
    });
  } catch (err) {
    console.error("GET ORDER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
});

// COMPLETE ORDER (Finish Pickup)
router.patch("/:id/complete", authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const agentId = req.user.id;

    const result = await pool.query(
      `
      UPDATE orders
      SET status = 'completed'
      WHERE id = $1
        AND agent_id = $2
        AND status = 'in-progress'
      RETURNING *
      `,
      [orderId, agentId]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "Order not in progress or not assigned to you",
      });
    }

    res.json({
      success: true,
      order: result.rows[0],
    });
  } catch (err) {
    console.error("COMPLETE ORDER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to complete order",
    });
  }
});


module.exports = router;
