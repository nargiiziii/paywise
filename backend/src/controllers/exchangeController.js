const pool = require('../config/database');
const { getRates, getLastUpdated } = require('../services/rateService');
const Big = require('big.js');

const CURRENCIES = ['USD', 'AZN', 'BTC'];

async function getAccountId(userId) {
  const r = await pool.query('SELECT id FROM accounts WHERE user_id=$1', [userId]);
  return r.rows[0]?.id;
}

// GET /api/exchange/rates
exports.getRates = async (req, res) => {
  try {
    const rates = await getRates();
    const lastUpdated = await getLastUpdated();
    res.json({ rates, lastUpdated });
  } catch (err) {
    console.error('GetRates:', err);
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
};

// POST /api/exchange/convert
// Body: { from: 'USD', to: 'AZN', amount: 100 }
exports.convert = async (req, res) => {
  const { from, to, amount } = req.body;

  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'from, to, and amount are required' });
  }
  if (!CURRENCIES.includes(from) || !CURRENCIES.includes(to)) {
    return res.status(400).json({ error: `Unsupported currency. Use: ${CURRENCIES.join(', ')}` });
  }
  if (from === to) {
    return res.status(400).json({ error: 'Cannot convert to the same currency' });
  }

  let amtBig;
  try {
    amtBig = new Big(amount);
    if (amtBig.lte(0)) throw new Error();
  } catch {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock account row
    const accountId = await getAccountId(req.user.userId);
    if (!accountId) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Account not found' });
    }

    const accR = await client.query(
      'SELECT balances FROM accounts WHERE id=$1 FOR UPDATE',
      [accountId]
    );
    const balances = accR.rows[0].balances || { USD: 0, AZN: 0, BTC: 0 };

    // Get rate from DB
    const rateR = await client.query(
      'SELECT rate FROM exchange_rates WHERE base=$1 AND target=$2',
      [from, to]
    );
    if (!rateR.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(503).json({ error: 'Exchange rate not available. Try again in a moment.' });
    }
    const rateBig = new Big(rateR.rows[0].rate);

    // Validate balance
    const fromBalance = new Big(balances[from] || 0);
    if (fromBalance.lt(amtBig)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient ${from} balance` });
    }

    // Calculate received amount (8 decimal places for BTC)
    const received = amtBig.times(rateBig).round(to === 'BTC' ? 8 : 2);

    // Update balances atomically
    const newFrom = fromBalance.minus(amtBig).round(from === 'BTC' ? 8 : 2);
    const newTo = new Big(balances[to] || 0).plus(received).round(to === 'BTC' ? 8 : 2);

    const newBalances = { ...balances, [from]: parseFloat(newFrom), [to]: parseFloat(newTo) };

    // Sync legacy `balance` column with USD value
    const newUsd = newBalances.USD;
    await client.query(
      `UPDATE accounts SET balances=$1, balance=$2 WHERE id=$3`,
      [JSON.stringify(newBalances), newUsd, accountId]
    );

    // Record in transaction history
    const ref = 'EX' + Date.now();
    await client.query(
      `INSERT INTO transactions
         (reference, sender_account_id, receiver_account_id, amount, fee, note, category, status, type)
       VALUES ($1,$2,$2,$3,0,$4,'finance','completed','exchange')`,
      [
        ref,
        accountId,
        parseFloat(amtBig),
        `Exchange ${parseFloat(amtBig)} ${from} → ${parseFloat(received)} ${to} @ ${parseFloat(rateBig.round(6))}`
      ]
    );

    // Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1,$2,$3,'success')`,
      [
        req.user.userId,
        '💱 Exchange Complete',
        `${parseFloat(amtBig)} ${from} → ${parseFloat(received)} ${to}`
      ]
    );

    await client.query('COMMIT');

    res.json({
      from,
      to,
      sent: parseFloat(amtBig),
      received: parseFloat(received),
      rate: parseFloat(rateBig),
      balances: newBalances,
      reference: ref
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Convert:', err);
    res.status(500).json({ error: 'Exchange failed' });
  } finally {
    client.release();
  }
};
