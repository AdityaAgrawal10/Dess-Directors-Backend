// src/routes/directorRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getDirectorProfile,
  updateDirectorProfile
} = require('../controllers/directorController');

// All routes here should be protected
router.get('/profile', protect, getDirectorProfile);
router.put('/profile', protect, updateDirectorProfile);

module.exports = router;
