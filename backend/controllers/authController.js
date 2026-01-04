// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

// Helper function to generate JWT token
const generateToken = (user, userType) => {
  return jwt.sign(
    { id: user.id, phone: user.phone, userType },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  const { name, phone, email, password, userType } = req.body;

  try {
    // Validate input
    if (!name || !phone || !password || !userType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, phone, password, and user type are required' 
      });
    }

    if (!['customer', 'agent'].includes(userType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user type. Must be "customer" or "agent"' 
      });
    }

    // Validate phone format (basic validation)
    if (phone.length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid phone number' 
      });
    }

    // Select the appropriate table
    const table = userType === 'customer' ? 'customers' : 'agents';

    // Check if user already exists
    const existingUser = await query(
      `SELECT * FROM ${table} WHERE phone = $1`,
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'User with this phone number already exists' 
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await query(
        `SELECT * FROM ${table} WHERE email = $1`,
        [email]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'User with this email already exists' 
        });
      }
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await query(
      `INSERT INTO ${table} (name, phone, email, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, phone, email, created_at`,
      [name, phone, email || null, passwordHash]
    );

    const newUser = result.rows[0];

    // Generate JWT token
    const token = generateToken(newUser, userType);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          phone: newUser.phone,
          email: newUser.email,
          userType
        },
        token
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during signup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { phone, password, userType } = req.body;

  try {
    // Validate input
    if (!phone || !password || !userType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone, password, and user type are required' 
      });
    }

    if (!['customer', 'agent'].includes(userType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user type. Must be "customer" or "agent"' 
      });
    }

    // Select the appropriate table
    const table = userType === 'customer' ? 'customers' : 'agents';

    // Find user
    const result = await query(
      `SELECT * FROM ${table} WHERE phone = $1`,
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = generateToken(user, userType);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          userType
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const { id, userType } = req.user;
    const table = userType === 'customer' ? 'customers' : 'agents';

    const result = await query(
      `SELECT id, name, phone, email, created_at FROM ${table} WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        userType
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Logout user (client-side handles token removal)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  // Note: With JWT, logout is mainly handled client-side by removing the token
  // This endpoint exists for consistency and can be used for logging/analytics
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};