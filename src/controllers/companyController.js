// src/controllers/companyController.js

const asyncHandler = require('express-async-handler');
const { pool } = require('../config/db');

/**
 * @desc    Get company profile by userId
 * @route   GET /api/companies/profile
 * @access  Private (company only)
 */
const getCompanyProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  if (req.user.role !== 'COMPANY') {
    return res.status(403).json({ message: 'Access denied. Not a company.' });
  }

  const [rows] = await pool.query(
    `SELECT * FROM CompanyProfiles WHERE userId = ?`,
    [userId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Company profile not found.' });
  }

  res.status(200).json(rows[0]);
});

/**
 * @desc    Update company profile
 * @route   PUT /api/companies/profile
 * @access  Private (company only)
 */
const updateCompanyProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  if (req.user.role !== 'COMPANY') {
    return res.status(403).json({ message: 'Access denied. Not a company.' });
  }

  const { companyName, companyDescription, location, website } = req.body;

  await pool.query(
    `UPDATE CompanyProfiles
     SET companyName = ?, companyDescription = ?, location = ?, website = ?
     WHERE userId = ?`,
    [companyName, companyDescription, location, website, userId]
  );

  res.status(200).json({ message: 'Company profile updated successfully.' });
});

module.exports = {
  getCompanyProfile,
  updateCompanyProfile
};
