// src/controllers/boardVacancyController.js
//total
const asyncHandler = require('express-async-handler');
const { pool } = require('../config/db');

/**
 * @desc    Create a new board vacancy
 * @route   POST /api/vacancies
 * @access  Private (company only)
 */
const createVacancy = asyncHandler(async (req, res) => {
  // Must be company
  if (req.user.role !== 'COMPANY') {
    return res.status(403).json({ message: 'Access denied. Only companies can create vacancies.' });
  }

  const userId = req.user.userId;
  const { title, functionArea, location, requiredExperience, sittingFees,minYearsExperience,MaxYearsExperience } = req.body;

  // Find the companyId linked to this userId
  const [companyRows] = await pool.query(
    'SELECT companyId FROM CompanyProfiles WHERE userId = ?',
    [userId]
  );
  if (companyRows.length === 0) {
    return res.status(404).json({ message: 'Company profile not found.' });
  }
  const companyId = companyRows[0].companyId;

  // Insert new vacancy
  const [result] = await pool.query(
    `INSERT INTO BoardVacancies 
     (companyId, title, functionArea, location, requiredExperience, sittingFees, minYearsExperience, maxYearsExperience) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [companyId, title, functionArea || null, location || null, requiredExperience || null, sittingFees || null, minYearsExperience || null, MaxYearsExperience || null]
  );

  return res.status(201).json({ 
    message: 'Board vacancy created successfully',
    vacancyId: result.insertId 
  });
});

/**
 * @desc    Get all vacancies (with optional filters)
 * @route   GET /api/vacancies
 * @access  Public (or private if you prefer)
 */
const getAllVacancies = asyncHandler(async (req, res) => {
  // We can implement basic filtering using query params, e.g. ?location=XYZ&functionArea=ABC
  const {
    location,
    functionArea,
    minExp,
    maxExp,
    page = 1,
    limit = 10,
    sortField = 'vacancyId', 
    sortOrder = 'DESC'
  } = req.query;

  // Convert to numbers
  const pageNum = Number(page);
  const limitNum = Number(limit);

  // Calculate offset (how many rows to skip)
  const offset = (pageNum - 1) * limitNum;


  let query = `SELECT v.*, c.companyName 
               FROM BoardVacancies v
               JOIN CompanyProfiles c ON v.companyId = c.companyId
               WHERE v.isActive = 1`;
  const params = [];

  if (location) {
    query += ` AND v.location = ?`;
    params.push(location);
  }
  if (functionArea) {
    query += ` AND v.functionArea = ?`;
    params.push(functionArea);
  }

  if (minExp) {
    query += ` AND (v.minYearsExperience IS NULL OR v.minYearsExperience <= ?)`;
    // Explanation: If minYearsExperience is not set (NULL), we won't exclude it,
    // or if it's set, ensure it's <= minExp. Another approach is requiring it NOT null.
    params.push(Number(minExp));
  }

  // If they want to filter by maximum experience
  if (maxExp) {
    query += ` AND (v.maxYearsExperience IS NULL OR v.maxYearsExperience >= ?)`;
    params.push(Number(maxExp));
  }

  query += ` ORDER BY ${sortField} ${sortOrder}`;

  query += ` LIMIT ? OFFSET ?`;
  params.push(limitNum, offset);

  const [rows] = await pool.query(query, params);
  res.status(200).json(rows);
});

/**
 * @desc    Get all vacancies posted by the logged-in company
 * @route   GET /api/vacancies/my
 * @access  Private (company only)
 */
const getCompanyVacancies = asyncHandler(async (req, res) => {
  if (req.user.role !== 'COMPANY') {
    return res.status(403).json({ message: 'Access denied. Only companies can view this.' });
  }

  const userId = req.user.userId;
  const [companyRows] = await pool.query(
    'SELECT companyId FROM CompanyProfiles WHERE userId = ?',
    [userId]
  );
  if (companyRows.length === 0) {
    return res.status(404).json({ message: 'Company profile not found.' });
  }
  const companyId = companyRows[0].companyId;

  const [rows] = await pool.query(
    `SELECT * 
     FROM BoardVacancies 
     WHERE companyId = ?`,
    [companyId]
  );
  res.status(200).json(rows);
});

/**
 * @desc    Get a specific vacancy by ID
 * @route   GET /api/vacancies/:id
 * @access  Public (or private if you prefer)
 */
const getVacancyById = asyncHandler(async (req, res) => {
  const vacancyId = req.params.id;
  const [rows] = await pool.query(
    `SELECT v.*, c.companyName
     FROM BoardVacancies v
     JOIN CompanyProfiles c ON v.companyId = c.companyId
     WHERE v.vacancyId = ?`,
    [vacancyId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Vacancy not found.' });
  }
  res.status(200).json(rows[0]);
});

/**
 * @desc    Update a board vacancy (company only)
 * @route   PUT /api/vacancies/:id
 * @access  Private (company only)
 */
const updateVacancy = asyncHandler(async (req, res) => {
  if (req.user.role !== 'COMPANY') {
    return res.status(403).json({ message: 'Access denied. Only companies can update vacancies.' });
  }

  const vacancyId = req.params.id;
  const userId = req.user.userId;
  const { title, functionArea, location, requiredExperience, sittingFees, isActive,minYearsExperience,maxYearsExperience } = req.body;

  // Make sure this vacancy belongs to the logged-in company
  const [companyRows] = await pool.query(
    'SELECT companyId FROM CompanyProfiles WHERE userId = ?',
    [userId]
  );
  if (companyRows.length === 0) {
    return res.status(404).json({ message: 'Company profile not found.' });
  }
  const companyId = companyRows[0].companyId;

  // Check if the vacancy is indeed owned by this company
  const [vacancyRows] = await pool.query(
    'SELECT * FROM BoardVacancies WHERE vacancyId = ? AND companyId = ?',
    [vacancyId, companyId]
  );
  if (vacancyRows.length === 0) {
    return res.status(403).json({ message: 'You do not own this vacancy or it does not exist.' });
  }

  // Perform the update
  await pool.query(
    `UPDATE BoardVacancies
     SET title = ?, functionArea = ?, location = ?, requiredExperience = ?, sittingFees = ?, isActive = ?, minYearsExperience = ?, maxYearsExperience = ?
     WHERE vacancyId = ?`,
    [title, functionArea, location, requiredExperience, sittingFees, isActive, minYearsExperience,maxYearsExperience, vacancyId]
  );

  res.status(200).json({ message: 'Vacancy updated successfully.' });
});

module.exports = {
  createVacancy,
  getAllVacancies,
  getCompanyVacancies,
  getVacancyById,
  updateVacancy,
};
