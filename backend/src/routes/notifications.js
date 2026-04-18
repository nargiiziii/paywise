// notifications.js
const express = require('express');
const r = express.Router();
const c = require('../controllers/notificationController');
const auth = require('../middleware/auth');
r.use(auth);
r.get('/', c.getNotifications);
r.post('/mark-all-read', c.markAllRead);
r.put('/:id/read', c.markRead);
module.exports = r;
