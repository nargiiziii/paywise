const express = require('express');
const r = express.Router();
const c = require('../controllers/virtualCardsController');
const auth = require('../middleware/auth');

r.use(auth);
r.get('/', c.list);
r.post('/', c.generate);
r.delete('/:id', c.destroy);
r.post('/charge', c.charge);

module.exports = r;
