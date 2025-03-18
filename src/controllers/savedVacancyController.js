// src/controllers/savedVacancyController.js
const asyncHandler = require('express-async-handler');
const { pool } = require('../config/db');

/**
 * Toggle save for a vacancy.
 * POST /api/savedVacancies/:id
 */
const saveVacancy = asyncHandler(async (req, res) => {
  // Only directors can save vacancies
  if (req.user.role !== 'DIRECTOR') {
    return res.status(403).json({ message: 'Access denied. Only directors can save vacancies.' });
  }
  const vacancyId = req.params.id;
  const userId = req.user.userId;
  
  // Retrieve directorId from DirectorProfiles
  const [directorRows] = await pool.query(
    'SELECT directorId FROM DirectorProfiles WHERE userId = ?',
    [userId]
  );
  if (directorRows.length === 0) {
    return res.status(404).json({ message: 'Director profile not found.' });
  }
  const directorId = directorRows[0].directorId;
  
  // Check if vacancy is already saved
  const [existingRows] = await pool.query(
    'SELECT * FROM SavedVacancies WHERE directorId = ? AND vacancyId = ?',
    [directorId, vacancyId]
  );
  if (existingRows.length > 0) {
    // If already saved, remove it (unsave)
    await pool.query(
      'DELETE FROM SavedVacancies WHERE directorId = ? AND vacancyId = ?',
      [directorId, vacancyId]
    );
    return res.status(200).json({ message: 'Vacancy unsaved successfully.' });
  }
  
  // Insert saved vacancy record
  await pool.query(
    'INSERT INTO SavedVacancies (directorId, vacancyId) VALUES (?, ?)',
    [directorId, vacancyId]
  );
  res.status(201).json({ message: 'Vacancy saved successfully.' });
});

/**
 * Get all saved vacancies for the director.
 * GET /api/savedVacancies
 */
const getSavedVacancies = asyncHandler(async (req, res) => {
  if (req.user.role !== 'DIRECTOR') {
    return res.status(403).json({ message: 'Access denied. Only directors can view saved vacancies.' });
  }
  const userId = req.user.userId;
  
  // Retrieve directorId
  const [directorRows] = await pool.query(
    'SELECT directorId FROM DirectorProfiles WHERE userId = ?',
    [userId]
  );
  if (directorRows.length === 0) {
    return res.status(404).json({ message: 'Director profile not found.' });
  }
  const directorId = directorRows[0].directorId;
  
  // Get saved vacancies with details from BoardVacancies
  const [rows] = await pool.query(
    `SELECT sv.*, bv.title, bv.companyId, bv.location, bv.requiredExperience, bv.sittingFees
     FROM SavedVacancies sv
     JOIN BoardVacancies bv ON sv.vacancyId = bv.vacancyId
     WHERE sv.directorId = ?`,
    [directorId]
  );
  res.status(200).json(rows);
});

module.exports = {
  saveVacancy,
  getSavedVacancies,
};
