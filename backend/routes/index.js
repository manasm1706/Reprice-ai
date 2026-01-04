// routes/index.js
const express = require('express');
const router = express.Router();
import orderRoutes from "./orderRoutes.js";

router.use("/orders", orderRoutes);
import agentRoutes from "./agentRoutes.js";
router.use("/agent", agentRoutes);


// Import route modules
const authRoutes = require('./authRoutes');

// Mount routes
router.use('/auth', authRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'CashNow API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for API routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

module.exports = router;