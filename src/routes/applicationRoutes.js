// src/routes/applicationRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  applyToVacancy,
  getMyApplications,
  getCompanyApplications,
  updateApplicationStatus,
  getApplicationUpdates,
} = require('../controllers/applicationController');

// Director applies to a vacancy
router.post('/:vacancyId/apply', protect, applyToVacancy);

// Director checks their applications
router.get('/my', protect, getMyApplications);

// Company checks all applications to its vacancies
router.get('/company', protect, getCompanyApplications);

// Company updates an application status
router.put('/:applicationId', protect, updateApplicationStatus);

// Director checks for updates to their applications
router.get('/updates', protect, getApplicationUpdates);

module.exports = router;
