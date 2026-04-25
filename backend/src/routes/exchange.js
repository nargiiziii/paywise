const express = require('express');
const r = express.Router();
const c = require('../controllers/exchangeController');
const auth = require('../middleware/auth');

r.use(auth);
r.get('/rates', c.getRates);
r.post('/convert', c.convert);

module.exports = r;
