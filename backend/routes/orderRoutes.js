import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * CREATE ORDER (Customer Checkout)
 */
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
      paymentMethod,
    } = req.body;

    const customerId = req.user.id;

    // 1️⃣ Save address
    const addressResult = await pool.query(
      `INSERT INTO customer_addresses
       (customer_id, full_address, city, state, pincode, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [customerId, address, city, state, pincode, latitude, longitude]
    );

    const addressId = addressResult.rows[0].id;

    // 2️⃣ Save order
    const orderResult = await pool.query(
      `INSERT INTO orders
       (customer_id, address_id, phone_model, phone_variant, phone_condition,
        price, pickup_date, payment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
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
      ]
    );

    res.status(201).json({
      success: true,
      order: orderResult.rows[0],
    });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

export default router;
