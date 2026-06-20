require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('./database');
const bcrypt = require('bcryptjs');

function genIBAN() {
  const n = () => Math.floor(1000000000000000 + Math.random() * 9000000000000000);
  return `US${Math.floor(10 + Math.random() * 90)}0000${n()}`;
}

function genCardNumber() {
  const groups = Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000));
  return groups.join(' ');
}

function genRef() {
  return 'PW' + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function daysAgo(d) {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 59));
  return date;
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log('\n🌱 PayWise Seeder v2.0 starting...\n');

    // Ensure virtual_cards table exists with correct schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS virtual_cards (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        card_number   VARCHAR(19) NOT NULL UNIQUE,
        cvv           VARCHAR(64) NOT NULL,
        expiry_month  CHAR(2) NOT NULL,
        expiry_year   CHAR(4) NOT NULL,
        label         VARCHAR(60),
        status        VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        used_at       TIMESTAMPTZ,
        expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
      );
    `);

    await client.query('TRUNCATE activity_log, notifications, beneficiaries, savings_goals, transactions, accounts, users RESTART IDENTITY CASCADE');


    const password = await bcrypt.hash('password123', 12);

    // ---- USERS ----
    const usersRaw = [
      { name: 'Alex Morgan',      email: 'alex@paywise.com',    avatar: '🧑', balance: 24750.50, savings: 8200.00,  phone: '+1 555-0101', occupation: 'Software Engineer', address: 'San Francisco, CA' },
      { name: 'Sofia Chen',       email: 'sofia@paywise.com',   avatar: '👩', balance: 8320.75,  savings: 2100.00,  phone: '+1 555-0102', occupation: 'UX Designer',       address: 'New York, NY' },
      { name: 'Marcus Johnson',   email: 'marcus@paywise.com',  avatar: '👨', balance: 15600.00, savings: 5500.00,  phone: '+1 555-0103', occupation: 'Product Manager',   address: 'Austin, TX' },
      { name: 'Elena Rodriguez',  email: 'elena@paywise.com',   avatar: '🧕', balance: 3200.25,  savings: 900.00,   phone: '+1 555-0104', occupation: 'Marketing Lead',   address: 'Miami, FL' },
      { name: 'James Wilson',     email: 'james@paywise.com',   avatar: '🧔', balance: 52100.00, savings: 18000.00, phone: '+1 555-0105', occupation: 'Entrepreneur',      address: 'Chicago, IL' },
      { name: 'Aisha Patel',      email: 'aisha@paywise.com',   avatar: '👩‍💼', balance: 11400.00, savings: 3200.00,  phone: '+1 555-0106', occupation: 'Data Scientist',   address: 'Seattle, WA' },
    ];

    const users = [];
    const accounts = [];

    for (const u of usersRaw) {
      const ur = await client.query(
        `INSERT INTO users (name, email, password, avatar, phone, occupation, address, is_verified, last_login)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW()) RETURNING *`,
        [u.name, u.email, password, u.avatar, u.phone, u.occupation, u.address]
      );
      users.push(ur.rows[0]);

      const acctNum = `PW${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const balances = JSON.stringify({ USD: u.balance, AZN: 0, BTC: 0 });
      const ar = await client.query(
        `INSERT INTO accounts (user_id, iban, account_number, balance, balances, savings_balance, currency, account_type, card_number, card_expiry, card_cvv, spending_limit)
         VALUES ($1,$2,$3,$4,$5,$6,'USD','checking',$7,$8,$9,15000.00) RETURNING *`,
        [ur.rows[0].id, genIBAN(), acctNum, u.balance, balances, u.savings,
         genCardNumber(),
         `${Math.floor(1+Math.random()*12).toString().padStart(2,'0')}/${(new Date().getFullYear()+3).toString().slice(2)}`,
         Math.floor(100 + Math.random() * 900).toString()]
      );
      accounts.push(ar.rows[0]);
    }
    console.log(`✅ Created ${users.length} users & accounts`);

    // ---- TRANSACTIONS ----
    const txTemplates = [
      { note: 'Monthly rent split', category: 'housing' },
      { note: 'Grocery run reimbursement', category: 'food' },
      { note: 'Netflix & Spotify split', category: 'entertainment' },
      { note: 'Dinner at Nobu', category: 'food' },
      { note: 'Freelance project payment', category: 'income' },
      { note: 'Concert tickets — sold out show', category: 'entertainment' },
      { note: 'Gym membership', category: 'health' },
      { note: 'Airbnb weekend trip', category: 'travel' },
      { note: 'Birthday gift 🎂', category: 'gifts' },
      { note: 'Morning coffee ☕', category: 'food' },
      { note: 'AWS invoice', category: 'technology' },
      { note: 'Loan repayment installment', category: 'finance' },
      { note: 'Office supplies', category: 'work' },
      { note: 'Utilities + Internet', category: 'housing' },
      { note: 'Udemy course — React Advanced', category: 'education' },
      { note: 'Pharmacy & vitamins', category: 'health' },
      { note: 'Running shoes', category: 'shopping' },
      { note: 'Car wash + detailing', category: 'transport' },
      { note: 'Book club subscription', category: 'education' },
      { note: 'Charity — Red Cross', category: 'charity' },
      { note: 'Flight SFO → NYC', category: 'travel' },
      { note: 'Dental checkup', category: 'health' },
      { note: 'Software license renewal', category: 'technology' },
      { note: 'Investment dividend', category: 'income' },
      { note: 'Haircut', category: 'personal' },
      { note: 'Dog grooming 🐶', category: 'personal' },
      { note: 'Home repair supplies', category: 'housing' },
      { note: 'Sushi dinner 🍣', category: 'food' },
      { note: 'Parking fine (oops)', category: 'transport' },
      { note: 'Wine subscription', category: 'food' },
    ];

    const amounts = [15, 25, 42, 50, 80, 120, 175, 200, 350, 500, 750, 1000, 1200, 40, 99, 18.5, 60, 250, 450, 85];

    let txCount = 0;
    for (let i = 0; i < 80; i++) {
      let si = Math.floor(Math.random() * accounts.length);
      let ri = Math.floor(Math.random() * accounts.length);
      while (ri === si) ri = Math.floor(Math.random() * accounts.length);

      const t = txTemplates[i % txTemplates.length];
      const amount = amounts[Math.floor(Math.random() * amounts.length)];
      const status = i % 15 === 0 ? 'pending' : i % 25 === 0 ? 'failed' : 'completed';
      const day = Math.floor(Math.random() * 120);

      await client.query(
        `INSERT INTO transactions (reference, sender_account_id, receiver_account_id, amount, fee, note, category, status, type, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'transfer',$9)`,
        [genRef(), accounts[si].id, accounts[ri].id, amount, amount >= 200 ? 0.5 : 0, t.note, t.category, status, daysAgo(day)]
      );
      txCount++;
    }
    console.log(`✅ Created ${txCount} transactions`);

    // ---- SAVINGS GOALS ----
    const goalSets = [
      [{ name: 'New MacBook Pro', target: 3500, current: 1800, emoji: '💻', deadline: '2025-06-01' },
       { name: 'Europe Trip ✈️', target: 8000, current: 3200, emoji: '🌍', deadline: '2025-09-15' },
       { name: 'Emergency Fund', target: 10000, current: 8750, emoji: '🛡️', deadline: null }],
      [{ name: 'Wedding Ring 💍', target: 5000, current: 2100, emoji: '💍', deadline: '2025-12-01' },
       { name: 'Interior Design', target: 4000, current: 600, emoji: '🏠', deadline: null }],
      [{ name: 'Tesla Model 3', target: 12000, current: 5500, emoji: '🚗', deadline: '2026-03-01' }],
      [{ name: 'Japan Trip 🗾', target: 6000, current: 900, emoji: '🗾', deadline: '2025-11-01' }],
      [{ name: 'Yacht Charter', target: 25000, current: 18000, emoji: '⛵', deadline: '2025-08-01' },
       { name: 'Investment Seed', target: 50000, current: 32000, emoji: '📈', deadline: null }],
      [{ name: 'PhD Fund', target: 15000, current: 3200, emoji: '🎓', deadline: '2026-09-01' }],
    ];

    for (let u = 0; u < users.length; u++) {
      for (const g of goalSets[u] || []) {
        await client.query(
          `INSERT INTO savings_goals (user_id, name, target_amount, current_amount, emoji, deadline)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [users[u].id, g.name, g.target, g.current, g.emoji, g.deadline || null]
        );
      }
    }
    console.log(`✅ Created savings goals`);

    // ---- NOTIFICATIONS ----
    const notifSets = [
      { title: '💰 Transfer received', message: 'You received $350.00 from Sofia Chen', type: 'success' },
      { title: '🔒 New login detected', message: 'Login from Chrome on macOS — San Francisco', type: 'security' },
      { title: '🎯 Savings goal milestone!', message: 'Europe Trip is 40% funded — keep going!', type: 'info' },
      { title: '📊 Monthly report ready', message: 'Your October summary is available', type: 'info' },
      { title: '⚠️ Spending limit alert', message: 'You have used 80% of your monthly limit', type: 'warning' },
      { title: '✅ Transfer confirmed', message: '$200.00 sent to Marcus Johnson', type: 'success' },
    ];

    for (const user of users) {
      const count = Math.floor(2 + Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const n = notifSets[i % notifSets.length];
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [user.id, n.title, n.message, n.type, i > 1, daysAgo(Math.floor(Math.random() * 10))]
        );
      }
    }
    console.log(`✅ Created notifications`);

    // ---- BENEFICIARIES ----
    for (let u = 0; u < users.length; u++) {
      const others = accounts.filter((_, i) => i !== u).slice(0, 3);
      for (let o = 0; o < others.length; o++) {
        await client.query(
          `INSERT INTO beneficiaries (user_id, name, iban, avatar) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [users[u].id, users[o < u ? o : o + 1]?.name || 'Contact', others[o].iban, users[o < u ? o : o + 1]?.avatar || '👤']
        );
      }
    }
    console.log(`✅ Created beneficiaries`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏦  PAYWISE SEED COMPLETE — Test Accounts');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    for (let i = 0; i < users.length; i++) {
      console.log(`  ${users[i].avatar}  ${users[i].name.padEnd(20)} ${users[i].email.padEnd(25)} $${usersRaw[i].balance.toLocaleString()}`);
    }
    console.log('\n  🔑 All passwords: password123\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
