// src/routes/notificationsRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getNotifications } = require('../controllers/notificationsController');

// Get notifications for the director
router.get('/', protect, getNotifications);

module.exports = router;
