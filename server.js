// server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./src/config/db');

const app = express();

const authRoutes = require('./src/routes/authRoutes');

const directorRoutes = require('./src/routes/directorRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const boardVacancyRoutes = require('./src/routes/boardVacancyRoutes');
const applicationRoutes = require('./src/routes/applicationRoutes');
const savedVacancyRoutes = require('./src/routes/savedVacancyRoutes');
const notificationsRoutes = require('./src/routes/notificationsRoutes');


// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.use('/api/directors', directorRoutes);

app.use('/api/companies', companyRoutes);

app.use('/api/vacancies', boardVacancyRoutes);

app.use('/api/applications', applicationRoutes);

app.use('/api/savedVacancies', savedVacancyRoutes);

app.use('/api/notifications', notificationsRoutes);


// Placeholder route
app.get('/api/', (req, res) => {
  res.send('Director Hiring Portal API is running...');
});

// Start the server
const PORT = process.env.PORT || 8080;
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1); // Stop the process if we can't connect to the DB
  });

