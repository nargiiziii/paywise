const pool = require('../config/database');

exports.getBalance = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM accounts WHERE user_id=$1', [req.user.userId]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Account not found' });
    const a = r.rows[0];
    res.json({
      balance: parseFloat(a.balance),
      balances: a.balances || { USD: parseFloat(a.balance), AZN: 0, BTC: 0 },
      savings_balance: parseFloat(a.savings_balance),
      iban: a.iban,
      account_number: a.account_number,
      currency: a.currency,
      card_number: a.card_number,
      card_expiry: a.card_expiry,
      card_frozen: a.card_frozen,
      spending_limit: parseFloat(a.spending_limit),
      monthly_spent: parseFloat(a.monthly_spent),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.verifyIban = async (req, res) => {
  const { iban } = req.params;
  try {
    const r = await pool.query(
      `SELECT u.name, u.avatar, a.iban FROM accounts a JOIN users u ON u.id=a.user_id WHERE a.iban=$1`,
      [iban.trim().toUpperCase()]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Account not found' });

    const own = await pool.query('SELECT iban FROM accounts WHERE user_id=$1', [req.user.userId]);
    if (own.rows[0]?.iban === iban.trim().toUpperCase()) {
      return res.status(400).json({ error: 'This is your own account' });
    }
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.toggleCardFreeze = async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE accounts SET card_frozen = NOT card_frozen WHERE user_id=$1 RETURNING card_frozen`,
      [req.user.userId]
    );
    const frozen = r.rows[0].card_frozen;
    // Notification
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)`,
      [req.user.userId, frozen ? '🔒 Card Frozen' : '🔓 Card Unfrozen',
       frozen ? 'Your card has been frozen. No transactions will be processed.' : 'Your card is active again.',
       frozen ? 'warning' : 'success']
    );
    res.json({ card_frozen: frozen, message: frozen ? 'Card frozen' : 'Card unfrozen' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.transferToSavings = async (req, res) => {
  const { amount, direction } = req.body; // direction: 'to_savings' | 'from_savings'
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query('SELECT * FROM accounts WHERE user_id=$1 FOR UPDATE', [req.user.userId]);
    const a = r.rows[0];

    if (direction === 'to_savings') {
      if (parseFloat(a.balance) < amt) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Insufficient balance' }); }
      await client.query(`
        UPDATE accounts SET 
          balance = balance - $1, 
          savings_balance = savings_balance + $1,
          balances = balances || jsonb_build_object('USD', (balances->>'USD')::decimal - $1)
        WHERE id = $2`, [amt, a.id]);
    } else {
      if (parseFloat(a.savings_balance) < amt) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Insufficient savings' }); }
      await client.query(`
        UPDATE accounts SET 
          savings_balance = savings_balance - $1, 
          balance = balance + $1,
          balances = balances || jsonb_build_object('USD', (balances->>'USD')::decimal + $1)
        WHERE id = $2`, [amt, a.id]);
    }
    await client.query('COMMIT');

    const updated = await pool.query('SELECT balance, savings_balance FROM accounts WHERE user_id=$1', [req.user.userId]);
    res.json({
      message: direction === 'to_savings' ? 'Moved to savings!' : 'Moved to main account!',
      balance: parseFloat(updated.rows[0].balance),
      savings_balance: parseFloat(updated.rows[0].savings_balance)
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};
