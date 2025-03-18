// src/routes/savedVacancyRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveVacancy, getSavedVacancies } = require('../controllers/savedVacancyController');

// Toggle save (or unsave) a vacancy
router.post('/:id', protect, saveVacancy);
// Get all saved vacancies for the director
router.get('/', protect, getSavedVacancies);

module.exports = router;
