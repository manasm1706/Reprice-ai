import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET NEARBY ORDERS (10–20 km)
 */
router.get("/nearby-orders", authenticateToken, async (req, res) => {
  try {
    const agentId = req.user.id;

    // 1️⃣ Get agent location
    const agentResult = await pool.query(
      "SELECT latitude, longitude FROM agents WHERE id = $1",
      [agentId]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const { latitude, longitude } = agentResult.rows[0];

    // 2️⃣ Distance query
    const ordersResult = await pool.query(
      `
      SELECT 
        o.id,
        o.phone_model,
        o.phone_variant,
        o.phone_condition,
        o.price,
        o.status,
        o.pickup_date,

        c.name AS customer_name,
        c.phone AS customer_phone,

        ca.full_address,
        ca.city,
        ca.pincode,

        (
          6371 * acos(
            cos(radians($1))
            * cos(radians(ca.latitude))
            * cos(radians(ca.longitude) - radians($2))
            + sin(radians($1))
            * sin(radians(ca.latitude))
          )
        ) AS distance_km

      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN customer_addresses ca ON o.address_id = ca.id

      WHERE o.status = 'pending'
      HAVING (
        6371 * acos(
          cos(radians($1))
          * cos(radians(ca.latitude))
          * cos(radians(ca.longitude) - radians($2))
          + sin(radians($1))
          * sin(radians(ca.latitude))
        )
      ) <= 20
      ORDER BY distance_km ASC
      `,
      [latitude, longitude]
    );

    res.json({
      success: true,
      orders: ordersResult.rows,
    });
  } catch (err) {
    console.error("NEARBY ORDERS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

export default router;
