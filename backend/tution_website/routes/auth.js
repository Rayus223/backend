const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController.js'); // Remove the 's' to match controller filename

router.post('/register', register);
router.post('/login', login);

module.exports = router;