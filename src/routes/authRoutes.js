const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isNotAuthenticated, isAuthenticated } = require('../middlewares/authMiddleware');

router.get('/login', isNotAuthenticated, authController.showLogin);
router.post('/login', isNotAuthenticated, authController.login);

router.get('/register', isNotAuthenticated, authController.showRegister);
router.post('/register', isNotAuthenticated, authController.register);

router.get('/logout', isAuthenticated, authController.logout);

module.exports = router;
