const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// This handles POST requests to /api/auth/login
router.post('/login', adminController.login);

module.exports = router;