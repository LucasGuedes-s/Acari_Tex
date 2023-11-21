const express = require('express');
const router = express.Router();
const userController = require('../Controllers/UserController')

router.post('/user/login', userController.login);

module.exports = router;