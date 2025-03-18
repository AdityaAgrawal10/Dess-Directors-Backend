// src/controllers/applicationController.js

const asyncHandler = require('express-async-handler');
const { pool } = require('../config/db');

/**
 * @desc    Apply to a vacancy (director only)
 * @route   POST /api/applications/:vacancyId/apply
 * @access  Private (director only)
 */
const applyToVacancy = asyncHandler(async (req, res) => {
  if (req.user.role !== 'DIRECTOR') {
    return res.status(403).json({ message: 'Only directors can apply to vacancies.' });
  }

  const userId = req.user.userId;
  const vacancyId = req.params.vacancyId;

  // Get the directorId from the userId
  const [directorRows] = await pool.query(
    'SELECT directorId FROM DirectorProfiles WHERE userId = ?',
    [userId]
  );
  if (directorRows.length === 0) {
    return res.status(404).json({ message: 'Director profile not found.' });
  }
  const directorId = directorRows[0].directorId;

  // Check if vacancy exists and is active
  const [vacancyRows] = await pool.query(
    'SELECT * FROM BoardVacancies WHERE vacancyId = ? AND isActive = 1',
    [vacancyId]
  );
  if (vacancyRows.length === 0) {
    return res.status(404).json({ message: 'Vacancy not found or is not active.' });
  }

  // Check if already applied
  const [existingApp] = await pool.query(
    `SELECT * FROM Applications 
     WHERE directorId = ? AND vacancyId = ?`,
    [directorId, vacancyId]
  );
  if (existingApp.length > 0) {
    return res.status(400).json({ message: 'You have already applied to this vacancy.' });
  }

  // Create application
  await pool.query(
    `INSERT INTO Applications (directorId, vacancyId) 
     VALUES (?, ?)`,
    [directorId, vacancyId]
  );

  // --- Email Notification to the Company ---

  // 1. Get the company's user ID from the vacancy details

  const [vacRow] = await pool.query(
    `SELECT cp.userId AS companyUserId 
     FROM BoardVacancies v
     JOIN CompanyProfiles cp ON v.companyId = cp.companyId
     WHERE v.vacancyId = ?`,
    [vacancyId]
  );
  if (!vacRow || vacRow.length === 0) {
    return res.status(404).json({ message: 'Company not found for this vacancy.' });
  }
  const companyUserId = vacRow[0].companyUserId;

  // 2) Get the company's email from Users
  const [compUser] = await pool.query(`SELECT email FROM Users WHERE userId = ?`, [companyUserId]);
  if (!compUser || compUser.length === 0) {
    return res.status(404).json({ message: 'Company user not found.' });
  }
  const companyEmail = compUser[0].email;

  // 3) We can also get the director's name to include in the email
  const [dirRow] = await pool.query(`SELECT fullName FROM DirectorProfiles WHERE directorId = ?`, [directorId]);
  const directorName = dirRow[0]?.fullName || 'A Director';

  // 4) Send email
  const { sendMail } = require('../utils/mailer');
  const subject = 'New Application Received';
  const html = `
    <p>Hi,</p>
    <p>A new application has been submitted by <strong>${directorName}</strong> for your vacancy (ID: ${vacancyId}).</p>
    <p>Log in to your Company Dashboard to review it.</p>
  `;
  await sendMail({ to: companyEmail, subject, html });

  res.status(201).json({ message: 'Application submitted successfully.' });
});

/**
 * @desc    Get all applications by the logged-in director
 * @route   GET /api/applications/my
 * @access  Private (director only)
 */
const getMyApplications = asyncHandler(async (req, res) => {
  if (req.user.role !== 'DIRECTOR') {
    return res.status(403).json({ message: 'Only directors can view their applications.' });
  }

  const userId = req.user.userId;

  // Get directorId
  const [directorRows] = await pool.query(
    'SELECT directorId FROM DirectorProfiles WHERE userId = ?',
    [userId]
  );
  if (directorRows.length === 0) {
    return res.status(404).json({ message: 'Director profile not found.' });
  }
  const directorId = directorRows[0].directorId;

  // Get applications
  const [rows] = await pool.query(
    `SELECT a.applicationId, a.applicationStatus, a.appliedAt, 
            v.title, v.location, v.functionArea, v.sittingFees
     FROM Applications a
     JOIN BoardVacancies v ON a.vacancyId = v.vacancyId
     WHERE a.directorId = ?`,
    [directorId]
  );
  res.status(200).json(rows);
});

/**
 * @desc    Get all applications for the logged-in company’s vacancies
 * @route   GET /api/applications/company
 * @access  Private (company only)
 */
const getCompanyApplications = asyncHandler(async (req, res) => {
  if (req.user.role !== 'COMPANY') {
    return res.status(403).json({ message: 'Only companies can view applications to their vacancies.' });
  }

  const userId = req.user.userId;
  // Find the company's ID
  const [companyRows] = await pool.query(
    'SELECT companyId FROM CompanyProfiles WHERE userId = ?',
    [userId]
  );
  if (companyRows.length === 0) {
    return res.status(404).json({ message: 'Company profile not found.' });
  }
  const companyId = companyRows[0].companyId;

  // Query all applications for this company's vacancies
  const [rows] = await pool.query(
    `SELECT a.applicationId, a.applicationStatus, a.appliedAt,
            d.directorId, d.fullName, d.location as directorLocation,
            v.vacancyId, v.title
     FROM Applications a
     JOIN BoardVacancies v ON a.vacancyId = v.vacancyId
     JOIN DirectorProfiles d ON a.directorId = d.directorId
     WHERE v.companyId = ?`,
    [companyId]
  );

  res.status(200).json(rows);
});

/**
 * @desc    Update application status (company only)
 * @route   PUT /api/applications/:applicationId
 * @access  Private (company only)
 * @example body: { "applicationStatus": "REVIEWED" }
 */
const updateApplicationStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== 'COMPANY') {
    return res.status(403).json({ message: 'Only companies can update applications.' });
  }

  const applicationId = req.params.applicationId;
  const { applicationStatus } = req.body;
  if (!applicationStatus) {
    return res.status(400).json({ message: 'applicationStatus is required.' });
  }

  const userId = req.user.userId;
  // Find the company's ID
  const [companyRows] = await pool.query(
    'SELECT companyId FROM CompanyProfiles WHERE userId = ?',
    [userId]
  );
  if (companyRows.length === 0) {
    return res.status(404).json({ message: 'Company profile not found.' });
  }
  const companyId = companyRows[0].companyId;

  // Check if the application belongs to a vacancy that belongs to this company
  const [appRows] = await pool.query(
    `SELECT a.* 
     FROM Applications a
     JOIN BoardVacancies v ON a.vacancyId = v.vacancyId
     WHERE a.applicationId = ? AND v.companyId = ?`,
    [applicationId, companyId]
  );
  if (appRows.length === 0) {
    return res.status(403).json({ message: 'This application does not belong to your company.' });
  }

  // Update status
  await pool.query(
    'UPDATE Applications SET applicationStatus = ? WHERE applicationId = ?',
    [applicationStatus, applicationId]
  );

 // Optional: notify the director
  // 1) Fetch the director's ID/email
  const [appData] = await pool.query(`
    SELECT a.directorId, d.fullName, u.email
    FROM Applications a
    JOIN DirectorProfiles d ON a.directorId = d.directorId
    JOIN Users u ON d.userId = u.userId
    WHERE a.applicationId = ?
  `, [applicationId]);

  if (!appData || appData.length === 0) {
    return res.status(404).json({ message: 'Application not found.' });
  }
  const { directorId, fullName, email } = appData[0];

  // 2) Build the email
  const { sendMail } = require('../utils/mailer');
  const subject = 'Your Application Status Update';
  const html = `
    <p>Dear ${fullName || 'Director'},</p>
    <p>Your application status has been updated to <strong>${applicationStatus}</strong>.</p>
    <p>Thank you for using the Director Hiring Portal!</p>
  `;
  await sendMail({ to: email, subject, html });


  res.status(200).json({ message: 'Application status updated successfully.' });
});

/**
 * @desc    Get application updates for the logged-in director
 * @route   GET /api/applications/updates
 * @access  Private (director only)
 */
const getApplicationUpdates = asyncHandler(async (req, res) => {
  if (req.user.role !== 'DIRECTOR') {
    return res.status(403).json({ message: 'Only directors can view application updates.' });
  }

  const userId = req.user.userId;
  // Get directorId
  const [directorRows] = await pool.query(
    'SELECT directorId FROM DirectorProfiles WHERE userId = ?',
    [userId]
  );
  if (directorRows.length === 0) {
    return res.status(404).json({ message: 'Director profile not found.' });
  }
  const directorId = directorRows[0].directorId;

  // Retrieve applications with status SHORTLISTED or CONTACT_SHARED
  const [rows] = await pool.query(
    `SELECT a.applicationId, a.applicationStatus, a.appliedAt, 
            v.title, v.location, v.functionArea, v.sittingFees
     FROM Applications a
     JOIN BoardVacancies v ON a.vacancyId = v.vacancyId
     WHERE a.directorId = ? AND a.applicationStatus IN (?, ?)`,
    [directorId, 'SHORTLISTED', 'CONTACT_SHARED']
  );
  res.status(200).json(rows);
});

module.exports = {
  applyToVacancy,
  getMyApplications,
  getCompanyApplications,
  updateApplicationStatus,
  getApplicationUpdates,
};
