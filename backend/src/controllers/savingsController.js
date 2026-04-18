const pool = require('../config/database');

exports.getGoals = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM savings_goals WHERE user_id=$1 AND status='active' ORDER BY created_at DESC`,
      [req.user.userId]
    );
    res.json(r.rows.map(g => ({ ...g, target_amount: parseFloat(g.target_amount), current_amount: parseFloat(g.current_amount) })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createGoal = async (req, res) => {
  const { name, target_amount, emoji, deadline } = req.body;
  if (!name || !target_amount) return res.status(400).json({ error: 'Name and target required' });
  try {
    const r = await pool.query(
      `INSERT INTO savings_goals (user_id, name, target_amount, emoji, deadline) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.userId, name, parseFloat(target_amount), emoji || '🎯', deadline || null]
    );
    res.status(201).json({ ...r.rows[0], target_amount: parseFloat(r.rows[0].target_amount), current_amount: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.contributeToGoal = async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const acct = await client.query('SELECT * FROM accounts WHERE user_id=$1 FOR UPDATE', [req.user.userId]);
    if (!acct.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Account not found' }); }
    if (parseFloat(acct.rows[0].balance) < amt) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Insufficient balance' }); }

    await client.query('UPDATE accounts SET balance=balance-$1, savings_balance=savings_balance+$1 WHERE user_id=$2', [amt, req.user.userId]);
    const goalR = await client.query(
      `UPDATE savings_goals SET current_amount=current_amount+$1 WHERE id=$2 AND user_id=$3 RETURNING *`,
      [amt, id, req.user.userId]
    );
    if (!goalR.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Goal not found' }); }

    const goal = goalR.rows[0];
    if (parseFloat(goal.current_amount) >= parseFloat(goal.target_amount)) {
      await client.query(`UPDATE savings_goals SET status='completed' WHERE id=$1`, [id]);
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'success')`,
        [req.user.userId, `🎉 Goal Achieved!`, `You've reached your "${goal.name}" goal!`]
      );
    }

    await client.query('COMMIT');
    const updAcct = await pool.query('SELECT balance, savings_balance FROM accounts WHERE user_id=$1', [req.user.userId]);
    res.json({
      goal: { ...goal, target_amount: parseFloat(goal.target_amount), current_amount: parseFloat(goal.current_amount) },
      balance: parseFloat(updAcct.rows[0].balance),
      savings_balance: parseFloat(updAcct.rows[0].savings_balance)
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    await pool.query(`UPDATE savings_goals SET status='archived' WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.userId]);
    res.json({ message: 'Goal removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
