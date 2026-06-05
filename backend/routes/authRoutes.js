const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword, resetPassword, verifyResetToken } = require('../controllers/authController');
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

// @route   POST api/auth/forgot-password
// @desc    Submit forgot password request
router.post('/forgot-password', forgotPassword);

// @route   POST api/auth/reset-password
// @desc    Reset password using token
router.post('/reset-password', resetPassword);

// @route   GET api/auth/verify-reset-token/:token
// @desc    Verify reset token validity
router.get('/verify-reset-token/:token', verifyResetToken);

module.exports = router;
