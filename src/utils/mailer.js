// src/utils/mailer.js

const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,     // e.g. "smtp.example.com"
  port: process.env.MAIL_PORT,     // e.g. 587
  secure: false,                   // true if using TLS
  auth: {
    user: process.env.MAIL_USER,   // e.g. "noreply@example.com"
    pass: process.env.MAIL_PASS
  }
});

/**
 * Sends an email.
 * @param {Object} options
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Subject line of the email.
 * @param {string} options.html - HTML content of the email.
 */

// A helper function to send an email
async function sendMail({ to, subject, html }) {
 try{

  await transporter.sendMail({
    from: `"Director Hiring" <${process.env.MAIL_USER}>`, // adjust as needed
    to,
    subject,
    html
  });
  console.log(`Email sent to ${to}`);
} catch (error) {
  console.error('Error sending email:', error);
}
}

module.exports = { sendMail };
