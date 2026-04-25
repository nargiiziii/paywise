const pool = require('../config/database');
const crypto = require('crypto');

// ──────────────────────────────────────────────
// Luhn Algorithm – generates a valid card number
// ──────────────────────────────────────────────
function luhnChecksum(number) {
  let sum = 0;
  let isEven = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10;
}

function generateLuhnNumber(prefix = '4532', length = 16) {
  // Fill with random digits up to length-1
  let number = prefix;
  while (number.length < length - 1) {
    number += Math.floor(Math.random() * 10).toString();
  }
  // Calculate and append Luhn check digit
  const checkDigit = (10 - (luhnChecksum(number + '0') % 10)) % 10;
  return number + checkDigit;
}

function formatCardNumber(raw) {
  return raw.match(/.{1,4}/g).join(' ');
}

function generateCVV() {
  return Math.floor(100 + Math.random() * 900).toString();
}

function generateExpiry() {
  const now = new Date();
  // Always expires today midnight — single-use lifetime
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const month = String(expiresAt.getMonth() + 1).padStart(2, '0');
  const year = String(expiresAt.getFullYear());
  return { month, year };
}

async function getAccountId(userId) {
  const r = await pool.query('SELECT id FROM accounts WHERE user_id=$1', [userId]);
  return r.rows[0]?.id;
}

// ──────────────────────────────────────────────
// POST /api/virtual-cards   — generate new card
// ──────────────────────────────────────────────
exports.generate = async (req, res) => {
  const { label } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const accountId = await getAccountId(req.user.userId);
    if (!accountId) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Account not found' });
    }

    // Expire any outstanding old virtual cards for this user (cleanup)
    await client.query(
      `UPDATE virtual_cards SET status='expired'
       WHERE user_id=$1 AND status='active' AND expires_at < NOW()`,
      [req.user.userId]
    );

    // Limit: max 5 active virtual cards at once
    const activeCount = await client.query(
      `SELECT COUNT(*) FROM virtual_cards WHERE user_id=$1 AND status='active'`,
      [req.user.userId]
    );
    if (parseInt(activeCount.rows[0].count) >= 5) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Maximum 5 active virtual cards allowed' });
    }

    // Generate card details
    let cardNumber, raw;
    let attempts = 0;
    do {
      raw = generateLuhnNumber('4532', 16);
      cardNumber = formatCardNumber(raw);
      const exists = await client.query(
        'SELECT 1 FROM virtual_cards WHERE card_number=$1', [cardNumber]
      );
      if (exists.rows.length === 0) break;
      attempts++;
    } while (attempts < 10);

    const cvv = generateCVV();
    const { month, year } = generateExpiry();

    // Store CVV hashed (security best practice)
    const cvvHash = crypto.createHash('sha256').update(cvv).digest('hex');

    const result = await client.query(
      `INSERT INTO virtual_cards
         (user_id, account_id, card_number, cvv, expiry_month, expiry_year, label, status, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active', NOW() + INTERVAL '24 hours')
       RETURNING *`,
      [req.user.userId, accountId, cardNumber, cvvHash,
       month, year, label?.trim() || 'Virtual Card']
    );

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, '🔐 Virtual Card Created', $2, 'success')`,
      [req.user.userId, `Card ending in ${raw.slice(-4)} is ready. It will self-destruct after first use.`]
    );

    await client.query('COMMIT');

    // Return card with plain CVV (only time it's shown)
    const card = result.rows[0];
    res.status(201).json({
      ...card,
      cvv,          // plain CVV returned once
      last4: raw.slice(-4),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('VirtualCard generate:', err);
    res.status(500).json({ error: 'Failed to generate card' });
  } finally {
    client.release();
  }
};

// ──────────────────────────────────────────────
// GET /api/virtual-cards   — list user's cards
// ──────────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    // Auto-expire first
    await pool.query(
      `UPDATE virtual_cards SET status='expired'
       WHERE user_id=$1 AND status='active' AND expires_at < NOW()`,
      [req.user.userId]
    );

    const r = await pool.query(
      `SELECT id, card_number, expiry_month, expiry_year, label, status,
              created_at, used_at, expires_at
       FROM virtual_cards
       WHERE user_id=$1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.userId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('VirtualCard list:', err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
};

// ──────────────────────────────────────────────
// DELETE /api/virtual-cards/:id   — manual destroy
// ──────────────────────────────────────────────
exports.destroy = async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE virtual_cards SET status='expired'
       WHERE id=$1 AND user_id=$2 AND status='active'
       RETURNING id`,
      [req.params.id, req.user.userId]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found or already destroyed' });
    }
    res.json({ message: 'Card destroyed successfully' });
  } catch (err) {
    console.error('VirtualCard destroy:', err);
    res.status(500).json({ error: 'Failed to destroy card' });
  }
};

// ──────────────────────────────────────────────
// POST /api/virtual-cards/charge   — simulate a charge
// This marks the card as 'used' after first transaction
// ──────────────────────────────────────────────
exports.charge = async (req, res) => {
  const { cardNumber, cvv, amount } = req.body;
  if (!cardNumber || !cvv || !amount) {
    return res.status(400).json({ error: 'cardNumber, cvv, and amount are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cardR = await client.query(
      `SELECT * FROM virtual_cards WHERE card_number=$1 FOR UPDATE`,
      [cardNumber]
    );

    if (cardR.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Card not found' });
    }

    const card = cardR.rows[0];

    if (card.status === 'used') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: 'This virtual card has already been used and self-destructed.',
        code: 'CARD_USED'
      });
    }

    if (card.status === 'expired' || new Date(card.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: 'This virtual card has expired.',
        code: 'CARD_EXPIRED'
      });
    }

    // Verify CVV
    const cvvHash = crypto.createHash('sha256').update(cvv.toString()).digest('hex');
    if (cvvHash !== card.cvv) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Invalid CVV', code: 'INVALID_CVV' });
    }

    // Check balance
    const accountR = await client.query(
      `SELECT balance FROM accounts WHERE id=$1 FOR UPDATE`,
      [card.account_id]
    );
    const balance = parseFloat(accountR.rows[0].balance);
    const chargeAmt = parseFloat(amount);

    if (balance < chargeAmt) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance', code: 'INSUFFICIENT_FUNDS' });
    }

    // Deduct balance
    await client.query(
      `UPDATE accounts SET balance = balance - $1 WHERE id = $2`,
      [chargeAmt, card.account_id]
    );

    // Mark card as USED (self-destruct)
    await client.query(
      `UPDATE virtual_cards SET status='used', used_at=NOW() WHERE id=$1`,
      [card.id]
    );

    // Record transaction
    await client.query(
      `INSERT INTO transactions (reference, sender_account_id, receiver_account_id, amount, fee, note, category, status, type)
       VALUES ($1, $2, $2, $3, 0, $4, 'finance', 'completed', 'virtual_card')`,
      [
        'VC' + Date.now(),
        card.account_id,
        chargeAmt,
        `Virtual Card charge — ${card.label} (****${card.card_number.slice(-4)})`
      ]
    );

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, '💳 Virtual Card Used & Destroyed', $2, 'info')`,
      [card.user_id, `$${chargeAmt} charged via ${card.label}. The card has self-destructed.`]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Charge successful. Virtual card has self-destructed.',
      charged: chargeAmt,
      cardDestroyed: true
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('VirtualCard charge:', err);
    res.status(500).json({ error: 'Charge failed' });
  } finally {
    client.release();
  }
};
