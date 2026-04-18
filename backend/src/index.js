require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting on auth
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, message: { error: 'Too many requests, try again later' } });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.get('/health', (_, res) => res.json({ status: 'ok', message: 'PayWise API v2.0' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/savings', require('./routes/savings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/beneficiaries', require('./routes/beneficiaries'));

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });

app.listen(PORT, async () => {
  console.log(`\n  PayWise API v2.0 → http://localhost:${PORT}`);
  try { await pool.query('SELECT 1'); console.log(' Database connected\n'); }
  catch (e) { console.error(' DB failed:', e.message, '\n  Check .env config\n'); }
});

module.exports = app;
