// src/routes/companyRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getCompanyProfile,
  updateCompanyProfile
} = require('../controllers/companyController');

router.get('/profile', protect, getCompanyProfile);
router.put('/profile', protect, updateCompanyProfile);

module.exports = router;
