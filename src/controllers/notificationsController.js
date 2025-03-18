// src/controllers/notificationsController.js
const asyncHandler = require('express-async-handler');
const { pool } = require('../config/db');

/**
 * Get notifications for the director.
 * GET /api/notifications
 */
const getNotifications = asyncHandler(async (req, res) => {
  if (req.user.role !== 'DIRECTOR') {
    return res.status(403).json({ message: 'Access denied. Only directors can view notifications.' });
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
  
  // Fetch notifications for the director
  const [rows] = await pool.query(
    'SELECT * FROM Notifications WHERE directorId = ? ORDER BY createdAt DESC',
    [directorId]
  );
  res.status(200).json(rows);
});

module.exports = {
  getNotifications,
};
