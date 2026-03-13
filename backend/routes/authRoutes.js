const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

// @route   POST api/auth/register
// @desc    Register a new user
router.post('/register', register);

// @route   POST api/auth/login
// @desc    Login a user
router.post('/login', login);

// @route   GET api/auth/me
// @desc    Get current user
router.get('/me', auth, getMe);

module.exports = router;
