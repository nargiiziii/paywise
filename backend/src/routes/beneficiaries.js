const express = require('express');
const r = express.Router();
const c = require('../controllers/beneficiaryController');
const auth = require('../middleware/auth');
r.use(auth);
r.get('/', c.getBeneficiaries);
r.post('/', c.addBeneficiary);
r.delete('/:id', c.deleteBeneficiary);
module.exports = r;
