// src/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const { registerUser, loginUser, forgotPassword, resetPassword } = require('../controllers/authController');

// Register
router.post('/register', registerUser);

// Login
router.post('/login', loginUser);

// Forgot Password (request reset link)
router.post('/forgot-password', forgotPassword);

// Reset Password (set new password)
router.post('/reset-password', resetPassword);

module.exports = router;
