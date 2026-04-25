const pool = require('../config/database');

function genRef() {
  return 'PW' + Date.now() + Math.random().toString(36).slice(2,6).toUpperCase();
}

const getAccountId = async (userId) => {
  const r = await pool.query('SELECT id FROM accounts WHERE user_id=$1', [userId]);
  return r.rows[0]?.id || null;
};

exports.getTransactions = async (req, res) => {
  const { type, sort='newest', page=1, limit=15, category, search } = req.query;
  const offset = (page - 1) * limit;

  try {
    const accountId = await getAccountId(req.user.userId);
    if (!accountId) return res.status(404).json({ error: 'Account not found' });

    let where = '(t.sender_account_id=$1 OR t.receiver_account_id=$1)';
    const params = [accountId];
    let p = 2;

    if (type === 'sent') where = 't.sender_account_id=$1';
    if (type === 'received') where = 't.receiver_account_id=$1';
    if (category && category !== 'all') { where += ` AND t.category=$${p++}`; params.push(category); }
    if (search) { where += ` AND (t.note ILIKE $${p} OR su.name ILIKE $${p} OR ru.name ILIKE $${p})`; params.push(`%${search}%`); p++; }

    const orderMap = {
      newest: 't.created_at DESC', oldest: 't.created_at ASC',
      amount_desc: 't.amount DESC', amount_asc: 't.amount ASC'
    };
    const order = orderMap[sort] || 't.created_at DESC';

    const q = `
      SELECT t.*, su.name as sender_name, su.avatar as sender_avatar,
             ru.name as receiver_name, ru.avatar as receiver_avatar,
             sa.iban as sender_iban, ra.iban as receiver_iban,
             CASE WHEN t.sender_account_id=$1 THEN 'sent' ELSE 'received' END as direction
      FROM transactions t
      JOIN accounts sa ON sa.id=t.sender_account_id
      JOIN accounts ra ON ra.id=t.receiver_account_id
      JOIN users su ON su.id=sa.user_id
      JOIN users ru ON ru.id=ra.user_id
      WHERE ${where}
      ORDER BY ${order}
      LIMIT $${p++} OFFSET $${p++}`;

    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(q, params);

    const cParams = params.slice(0, params.length - 2);
    const countQ = `SELECT COUNT(*) FROM transactions t JOIN accounts sa ON sa.id=t.sender_account_id JOIN accounts ra ON ra.id=t.receiver_account_id JOIN users su ON su.id=sa.user_id JOIN users ru ON ru.id=ra.user_id WHERE ${where}`;
    const countR = await pool.query(countQ, cParams);

    res.json({
      transactions: result.rows.map(tx => ({ ...tx, amount: parseFloat(tx.amount), fee: parseFloat(tx.fee || 0) })),
      pagination: { total: parseInt(countR.rows[0].count), page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(countR.rows[0].count / limit) }
    });
  } catch (err) {
    console.error('GetTx:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.transfer = async (req, res) => {
  const { receiverIban, amount, note, category='transfer', saveAsBeneficiary } = req.body;
  if (!receiverIban || !amount) return res.status(400).json({ error: 'IBAN and amount required' });

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (amt > 50000) return res.status(400).json({ error: 'Max single transfer: $50,000' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const senderR = await client.query(
      `SELECT a.*, u.name, u.avatar FROM accounts a JOIN users u ON u.id=a.user_id WHERE a.user_id=$1 FOR UPDATE`,
      [req.user.userId]
    );
    if (!senderR.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Sender account not found' }); }
    const sender = senderR.rows[0];

    if (parseFloat(sender.balance) < amt) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Insufficient balance' }); }
    if (sender.card_frozen) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Your card is frozen. Unfreeze it first.' }); }

    const receiverR = await client.query(
      `SELECT a.*, u.name, u.avatar FROM accounts a JOIN users u ON u.id=a.user_id WHERE a.iban=$1 FOR UPDATE`,
      [receiverIban.trim().toUpperCase()]
    );
    if (!receiverR.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Receiver account not found' }); }
    const receiver = receiverR.rows[0];

    if (sender.id === receiver.id) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Cannot transfer to yourself' }); }

    const fee = amt >= 500 ? 0.5 : 0;

    await client.query(
      `UPDATE accounts SET 
        balance = balance - $1, 
        monthly_spent = monthly_spent + $1,
        balances = balances || jsonb_build_object('USD', (balances->>'USD')::decimal - $1)
       WHERE id = $2`, 
      [amt + fee, sender.id]
    );
    await client.query(
      `UPDATE accounts SET 
        balance = balance + $1,
        balances = balances || jsonb_build_object('USD', (balances->>'USD')::decimal + $1)
       WHERE id = $2`, 
      [amt, receiver.id]
    );

    const ref = genRef();
    const txR = await client.query(
      `INSERT INTO transactions (reference,sender_account_id,receiver_account_id,amount,fee,note,category,status,type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'completed','transfer') RETURNING *`,
      [ref, sender.id, receiver.id, amt, fee, note || null, category]
    );

    // Notification for receiver
    const receiverUserR = await client.query('SELECT u.id FROM users u JOIN accounts a ON a.user_id=u.id WHERE a.id=$1', [receiver.id]);
    if (receiverUserR.rows[0]) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,'success')`,
        [receiverUserR.rows[0].id, '💰 Transfer received', `You received $${amt.toFixed(2)} from ${sender.name}`]
      );
    }

    // Save beneficiary if requested
    if (saveAsBeneficiary) {
      await client.query(
        `INSERT INTO beneficiaries (user_id, name, iban, avatar) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [req.user.userId, receiver.name, receiver.iban, receiver.avatar]
      );
    }

    await client.query('COMMIT');

    const updatedBalance = await pool.query('SELECT balance FROM accounts WHERE id=$1', [sender.id]);

    res.status(201).json({
      message: 'Transfer successful!',
      transaction: { ...txR.rows[0], amount: amt, sender_name: sender.name, receiver_name: receiver.name, receiver_avatar: receiver.avatar },
      newBalance: parseFloat(updatedBalance.rows[0].balance)
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transfer:', err);
    res.status(500).json({ error: 'Transfer failed' });
  } finally {
    client.release();
  }
};

exports.getRecent = async (req, res) => {
  try {
    const accountId = await getAccountId(req.user.userId);
    if (!accountId) return res.status(404).json({ error: 'Account not found' });

    const r = await pool.query(
      `SELECT t.*, su.name as sender_name, su.avatar as sender_avatar,
              ru.name as receiver_name, ru.avatar as receiver_avatar,
              CASE WHEN t.sender_account_id=$1 THEN 'sent' ELSE 'received' END as direction
       FROM transactions t
       JOIN accounts sa ON sa.id=t.sender_account_id
       JOIN accounts ra ON ra.id=t.receiver_account_id
       JOIN users su ON su.id=sa.user_id
       JOIN users ru ON ru.id=ra.user_id
       WHERE t.sender_account_id=$1 OR t.receiver_account_id=$1
       ORDER BY t.created_at DESC LIMIT 6`, [accountId]
    );
    res.json(r.rows.map(tx => ({ ...tx, amount: parseFloat(tx.amount) })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const accountId = await getAccountId(req.user.userId);
    if (!accountId) return res.status(404).json({ error: 'Account not found' });

    const monthly = await pool.query(
      `SELECT TO_CHAR(created_at,'Mon') as month, EXTRACT(MONTH FROM created_at) as mnum, EXTRACT(YEAR FROM created_at) as yr,
              SUM(CASE WHEN sender_account_id=$1 THEN amount ELSE 0 END) as sent,
              SUM(CASE WHEN receiver_account_id=$1 THEN amount ELSE 0 END) as received
       FROM transactions WHERE (sender_account_id=$1 OR receiver_account_id=$1)
         AND created_at >= NOW()-INTERVAL '6 months' AND status='completed'
       GROUP BY TO_CHAR(created_at,'Mon'), EXTRACT(MONTH FROM created_at), EXTRACT(YEAR FROM created_at)
       ORDER BY yr, mnum`, [accountId]
    );

    const totals = await pool.query(
      `SELECT SUM(CASE WHEN sender_account_id=$1 THEN amount ELSE 0 END) as total_sent,
              SUM(CASE WHEN receiver_account_id=$1 THEN amount ELSE 0 END) as total_received,
              COUNT(CASE WHEN sender_account_id=$1 THEN 1 END) as sent_count,
              COUNT(CASE WHEN receiver_account_id=$1 THEN 1 END) as received_count
       FROM transactions WHERE (sender_account_id=$1 OR receiver_account_id=$1) AND status='completed'`,
      [accountId]
    );

    const categories = await pool.query(
      `SELECT category, SUM(amount) as total, COUNT(*) as count
       FROM transactions WHERE sender_account_id=$1 AND status='completed'
       GROUP BY category ORDER BY total DESC LIMIT 6`, [accountId]
    );

    res.json({
      monthly: monthly.rows.map(r => ({ month: r.month, sent: parseFloat(r.sent||0), received: parseFloat(r.received||0) })),
      totals: { total_sent: parseFloat(totals.rows[0].total_sent||0), total_received: parseFloat(totals.rows[0].total_received||0), sent_count: parseInt(totals.rows[0].sent_count), received_count: parseInt(totals.rows[0].received_count) },
      categories: categories.rows.map(r => ({ category: r.category, total: parseFloat(r.total), count: parseInt(r.count) }))
    });
  } catch (err) {
    console.error('Stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Predictive Analytics: Forecast balance at end of month
 */
exports.getForecast = async (req, res) => {
  try {
    const accountId = await getAccountId(req.user.userId);
    if (!accountId) return res.status(404).json({ error: 'Account not found' });

    // 1. Get total spend in last 90 days
    const spendR = await pool.query(
      `SELECT SUM(amount) as total_spent, 
              MIN(created_at) as first_tx_date
       FROM transactions 
       WHERE sender_account_id = $1 
         AND status = 'completed' 
         AND created_at >= NOW() - INTERVAL '90 days'`,
      [accountId]
    );

    const totalSpent = parseFloat(spendR.rows[0].total_spent || 0);
    const firstTxDate = spendR.rows[0].first_tx_date ? new Date(spendR.rows[0].first_tx_date) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    // Calculate actual days in range (max 90)
    const now = new Date();
    const diffTime = Math.abs(now - firstTxDate);
    const actualDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const avgDailySpend = totalSpent / actualDays;

    // 2. Calculate days left in month
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysLeft = Math.max(0, lastDayOfMonth.getDate() - now.getDate());

    // 3. Get current balance
    const balanceR = await pool.query('SELECT balance FROM accounts WHERE id = $1', [accountId]);
    const currentBalance = parseFloat(balanceR.rows[0].balance);

    const predictedSpend = avgDailySpend * daysLeft;
    const predictedBalance = Math.max(0, currentBalance - predictedSpend);

    res.json({
      currentBalance,
      avgDailySpend,
      daysLeft,
      predictedSpend,
      predictedBalance,
      monthName: now.toLocaleString('en-US', { month: 'long' }),
      lastDay: lastDayOfMonth.getDate()
    });
  } catch (err) {
    console.error('Forecast:', err);
    res.status(500).json({ error: 'Forecast failed' });
  }
};

