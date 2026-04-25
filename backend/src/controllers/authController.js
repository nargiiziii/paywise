const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const sign = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET || 'paywise_secret', {
  expiresIn: process.env.JWT_EXPIRES_IN || '7d'
});

const fullUser = async (userId) => {
  const r = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar, u.phone, u.address, u.occupation,
            u.is_verified, u.two_fa_enabled, u.theme, u.created_at, u.last_login,
            a.id as account_id, a.iban, a.account_number, a.balance, a.balances, a.savings_balance,
            a.currency, a.account_type, a.card_number, a.card_expiry, a.card_frozen,
            a.spending_limit, a.monthly_spent
     FROM users u LEFT JOIN accounts a ON a.user_id = u.id WHERE u.id = $1`, [userId]
  );
  if (!r.rows[0]) return null;
  const d = r.rows[0];
  return {
    id: d.id, name: d.name, email: d.email, avatar: d.avatar,
    phone: d.phone, address: d.address, occupation: d.occupation,
    is_verified: d.is_verified, two_fa_enabled: d.two_fa_enabled,
    theme: d.theme, created_at: d.created_at, last_login: d.last_login,
    account: {
      id: d.account_id, iban: d.iban, account_number: d.account_number,
      balance: parseFloat(d.balance || 0),
      balances: d.balances || { USD: parseFloat(d.balance || 0), AZN: 0, BTC: 0 },
      savings_balance: parseFloat(d.savings_balance || 0),
      currency: d.currency, account_type: d.account_type,
      card_number: d.card_number, card_expiry: d.card_expiry,
      card_frozen: d.card_frozen, spending_limit: parseFloat(d.spending_limit || 0),
      monthly_spent: parseFloat(d.monthly_spent || 0),
    }
  };
};

exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  const client = await pool.connect();
  try {
    const exists = await client.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const avatars = ['🧑','👩','👨','🧕','🧔','👱','🧑‍💼','👩‍💼','🧑‍🎨','👩‍🔬'];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];

    const ur = await client.query(
      `INSERT INTO users (name, email, password, avatar, phone, is_verified, last_login)
       VALUES ($1,$2,$3,$4,$5,true,NOW()) RETURNING id`,
      [name.trim(), email.toLowerCase(), hashed, avatar, phone || null]
    );
    const userId = ur.rows[0].id;

    // Generate account
    const iban = `US${Math.floor(10+Math.random()*90)}0000${Math.floor(1e16+Math.random()*9e16)}`;
    const acctNum = `PW${Math.floor(1e9+Math.random()*9e9)}`;
    const cardGroups = Array.from({length:4}, () => Math.floor(1000+Math.random()*9000)).join(' ');
    const expMo = Math.floor(1+Math.random()*12).toString().padStart(2,'0');
    const expYr = (new Date().getFullYear()+3).toString().slice(2);

    const balances = JSON.stringify({ USD: 1000.00, AZN: 0, BTC: 0 });
    await client.query(
      `INSERT INTO accounts (user_id, iban, account_number, balance, balances, savings_balance, card_number, card_expiry, card_cvv, spending_limit)
       VALUES ($1,$2,$3,1000.00,$4,0.00,$5,$6,$7,10000.00)`,
      [userId, iban, acctNum, balances, cardGroups, `${expMo}/${expYr}`, Math.floor(100+Math.random()*900).toString()]
    );

    // Welcome notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'success')`,
      [userId, '🎉 Welcome to PayWise!', `Hi ${name.trim()}! Your account is ready. You start with a $1,000 welcome bonus!`]
    );

    await client.query(`UPDATE users SET last_login=NOW() WHERE id=$1`, [userId]);

    const token = sign(userId);
    const user = await fullUser(userId);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    if (!r.rows[0]) return res.status(401).json({ error: 'Invalid credentials' });

    const user = r.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);

    // Log activity
    await pool.query(
      `INSERT INTO activity_log (user_id, action, ip_address, device) VALUES ($1,$2,$3,$4)`,
      [user.id, 'login', req.ip, req.headers['user-agent']?.slice(0, 200) || 'Unknown']
    );

    const token = sign(user.id);
    const fullData = await fullUser(user.id);
    res.json({ token, user: fullData });
  } catch (err) {
    console.error('Login:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await fullUser(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, phone, address, occupation, currentPassword, newPassword } = req.body;
  const client = await pool.connect();
  try {
    const ur = await client.query('SELECT * FROM users WHERE id=$1', [req.user.userId]);
    const u = ur.rows[0];
    if (!u) return res.status(404).json({ error: 'User not found' });

    const sets = []; const vals = [];
    if (name?.trim()) { sets.push(`name=$${sets.length+1}`); vals.push(name.trim()); }
    if (phone !== undefined) { sets.push(`phone=$${sets.length+1}`); vals.push(phone); }
    if (address !== undefined) { sets.push(`address=$${sets.length+1}`); vals.push(address); }
    if (occupation !== undefined) { sets.push(`occupation=$${sets.length+1}`); vals.push(occupation); }
    if (req.body.theme !== undefined) { sets.push(`theme=$${sets.length+1}`); vals.push(req.body.theme); }

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
      const valid = await bcrypt.compare(currentPassword, u.password);
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'New password too short' });
      const hashed = await bcrypt.hash(newPassword, 12);
      sets.push(`password=$${sets.length+1}`); vals.push(hashed);
    }

    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    sets.push(`updated_at=NOW()`);
    vals.push(req.user.userId);
    await client.query(`UPDATE users SET ${sets.join(',')} WHERE id=$${vals.length}`, vals);

    const updated = await fullUser(req.user.userId);
    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    console.error('UpdateProfile:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.getActivityLog = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM activity_log WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.userId]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
