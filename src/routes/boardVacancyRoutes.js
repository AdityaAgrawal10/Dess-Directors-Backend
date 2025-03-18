// src/routes/boardVacancyRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createVacancy,
  getAllVacancies,
  getCompanyVacancies,
  getVacancyById,
  updateVacancy,
} = require('../controllers/boardVacancyController');

// Public or semi-public routes
router.get('/', getAllVacancies);       // GET /api/vacancies
router.get('/:id', getVacancyById);     // GET /api/vacancies/:id

// Protected routes for company
router.post('/', protect, createVacancy);          // POST /api/vacancies
router.get('/my/list', protect, getCompanyVacancies);  // GET /api/vacancies/my (list your own)
router.put('/:id', protect, updateVacancy);        // PUT /api/vacancies/:id

module.exports = router;
