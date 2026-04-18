// routes/auth.js
const express = require('express');
const r = express.Router();
const c = require('../controllers/authController');
const auth = require('../middleware/auth');
r.post('/register', c.register);
r.post('/login', c.login);
r.get('/me', auth, c.getMe);
r.put('/update-profile', auth, c.updateProfile);
r.get('/activity', auth, c.getActivityLog);
module.exports = r;
