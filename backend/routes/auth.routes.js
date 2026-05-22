const express = require('express');
const router = express.Router();

const { register, login, getMe } = require('../controllers/auth.controller');
const { validateRegister, validateLogin } = require('../validations/auth.validation');
const { protect } = require('../middleware/auth.middleware');

// router.post('/register', validateRegister, register); // Disabled for SuperAdmin-only creation
router.post('/login',    validateLogin,    login);
router.get('/me',        protect,          getMe);

module.exports = router;
