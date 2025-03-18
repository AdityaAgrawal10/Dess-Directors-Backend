// src/controllers/authController.js

const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');  // NEW
const { pool } = require('../config/db');
const { sendMail } = require('../utils/mailer');


// Helper to generate JWT
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '1d'
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = asyncHandler(async (req, res) => {
  const { email, password, role, fullName, companyName } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Please provide email, password, and role.' });
  }

  // Check if user already exists
  const [existingUser] = await pool.query(
    'SELECT * FROM Users WHERE email = ?',
    [email]
  );

  if (existingUser.length > 0) {
    return res.status(400).json({ message: 'User with this email already exists.' });
  }

  // Hash the password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Insert into Users
  const [result] = await pool.query(
    'INSERT INTO Users (email, passwordHash, role) VALUES (?, ?, ?)',
    [email, passwordHash, role]
  );

  const userId = result.insertId;

  // Create Director or Company profile, based on role
  if (role === 'DIRECTOR') {
    if (!fullName) {
      return res.status(400).json({ message: 'fullName is required for director registration.' });
    }

    await pool.query(
      `INSERT INTO DirectorProfiles (userId, fullName) VALUES (?, ?)`,
      [userId, fullName]
    );
  } else if (role === 'COMPANY') {
    if (!companyName) {
      return res.status(400).json({ message: 'companyName is required for company registration.' });
    }

    await pool.query(
      `INSERT INTO CompanyProfiles (userId, companyName) VALUES (?, ?)`,
      [userId, companyName]
    );
  }

  // Generate JWT token
  const token = generateToken(userId, role);

  return res.status(201).json({
    message: 'User registered successfully',
    user: {
      userId,
      email,
      role
    },
    token
  });
});

/**
 * @desc    Login a user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password.' });
  }

  // Check if user exists
  const [rows] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
  if (rows.length === 0) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const user = rows[0];

  // Compare password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  // Generate token
  const token = generateToken(user.userId, user.role);

  return res.status(200).json({
    message: 'Login successful',
    token,
    user: {
      userId: user.userId,
      email: user.email,
      role: user.role
    }
  });
});

/**
 * @desc Request a password reset (forgot password)
 * @route POST /api/auth/forgot-password
 * @access Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  // 1. Check if user exists
  const [rows] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
  if (rows.length === 0) {
    // For security, do not reveal whether the email is truly registered
    return res.status(200).json({ message: 'If that email is in our system, we sent a reset link.' });
  }

  const user = rows[0];

  // 2. Generate reset token (random string) & expiry
  const resetToken = crypto.randomBytes(32).toString('hex');  // 64-char hex
  const resetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes from now

  // 3. Store them in DB
  await pool.query(
    'UPDATE Users SET resetToken = ?, resetExpires = ? WHERE userId = ?',
    [resetToken, resetExpires, user.userId]
  );

  // 4. Construct reset URL (frontend link)
  //    - Example: http://localhost:5173/reset-password?token=abcdef
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  // 5. Send email
  const html = `
    <p>You requested a password reset.</p>
    <p>Click below link to reset (valid for 15 minutes):</p>
    <a href="${resetUrl}" target="_blank">${resetUrl}</a>
  `;
  await sendMail({
    to: email,
    subject: 'Password Reset Request',
    html
  });

  return res.status(200).json({
    message: 'A password reset link has been sent if that email exists.'
  });
});


/**
 * @desc Reset a user's password
 * @route POST /api/auth/reset-password
 * @access Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required.' });
  }

  // 1. Find user by token
  const [rows] = await pool.query(
    'SELECT * FROM Users WHERE resetToken = ? AND resetExpires > ?',
    [token, Date.now()]
  );

  if (rows.length === 0) {
    return res.status(400).json({ message: 'Invalid or expired token.' });
  }

  const user = rows[0];

  // 2. Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 3. Update user's password, clear reset token and expiry
  await pool.query(
    `UPDATE Users 
     SET passwordHash = ?, resetToken = NULL, resetExpires = NULL 
     WHERE userId = ?`,
    [hashedPassword, user.userId]
  );

  return res.status(200).json({ message: 'Password has been reset successfully.' });
});



module.exports = {
  registerUser,
  loginUser,
  forgotPassword,       // NEW
  resetPassword 
};

