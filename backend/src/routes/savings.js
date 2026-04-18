// savings.js
const express = require('express');
const r = express.Router();
const c = require('../controllers/savingsController');
const auth = require('../middleware/auth');
r.use(auth);
r.get('/', c.getGoals);
r.post('/', c.createGoal);
r.post('/:id/contribute', c.contributeToGoal);
r.delete('/:id', c.deleteGoal);
module.exports = r;
