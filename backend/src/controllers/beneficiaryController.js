const pool = require('../config/database');

exports.getBeneficiaries = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM beneficiaries WHERE user_id=$1 ORDER BY name ASC`,
      [req.user.userId]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.addBeneficiary = async (req, res) => {
  const { name, iban } = req.body;
  if (!name || !iban) return res.status(400).json({ error: 'Name and IBAN required' });
  try {
    // Verify IBAN exists
    const acctR = await pool.query(`SELECT u.avatar FROM accounts a JOIN users u ON u.id=a.user_id WHERE a.iban=$1`, [iban.toUpperCase()]);
    const r = await pool.query(
      `INSERT INTO beneficiaries (user_id, name, iban, avatar) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING *`,
      [req.user.userId, name, iban.toUpperCase(), acctR.rows[0]?.avatar || '👤']
    );
    if (!r.rows[0]) return res.status(409).json({ error: 'Already saved' });
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteBeneficiary = async (req, res) => {
  try {
    await pool.query(`DELETE FROM beneficiaries WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.userId]);
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
