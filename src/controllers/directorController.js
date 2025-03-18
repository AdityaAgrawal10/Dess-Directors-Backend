// src/controllers/directorController.js

const asyncHandler = require('express-async-handler');
const { pool } = require('../config/db');

/**
 * @desc    Get director profile by userId
 * @route   GET /api/directors/profile
 * @access  Private (director only)
 */
const getDirectorProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId; // from decoded token in middleware
  // Check if user role is DIRECTOR
  if (req.user.role !== 'DIRECTOR') {
    return res.status(403).json({ message: 'Access denied. Not a director.' });
  }

  const [rows] = await pool.query(
    `SELECT * FROM DirectorProfiles WHERE userId = ?`,
    [userId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Director profile not found.' });
  }

  res.status(200).json(rows[0]);
});

/**
 * @desc    Update director profile
 * @route   PUT /api/directors/profile
 * @access  Private (director only)
 */
const updateDirectorProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  if (req.user.role !== 'DIRECTOR') {
    return res.status(403).json({ message: 'Access denied. Not a director.' });
  }

  const { fullName, headline, experience, location, sittingFeesRange } = req.body;

  // Update the DirectorProfiles
  await pool.query(
    `UPDATE DirectorProfiles
     SET fullName = ?, headline = ?, experience = ?, location = ?, sittingFeesRange = ?
     WHERE userId = ?`,
    [fullName, headline, experience, location, sittingFeesRange, userId]
  );

  res.status(200).json({ message: 'Director profile updated successfully.' });
});

module.exports = {
  getDirectorProfile,
  updateDirectorProfile
};
