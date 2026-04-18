-- ============================================
-- PayWise Database Schema v2.0
-- Open this file and run in pgAdmin or psql
-- ============================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(10) DEFAULT '👤',
  phone VARCHAR(20),
  address TEXT,
  occupation VARCHAR(100),
  is_verified BOOLEAN DEFAULT false,
  two_fa_enabled BOOLEAN DEFAULT false,
  theme VARCHAR(20) DEFAULT 'dark',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  iban VARCHAR(34) UNIQUE NOT NULL,
  account_number VARCHAR(20) UNIQUE NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0.00,
  savings_balance DECIMAL(15,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  account_type VARCHAR(20) DEFAULT 'checking',
  card_number VARCHAR(19),
  card_expiry VARCHAR(7),
  card_cvv VARCHAR(4),
  card_frozen BOOLEAN DEFAULT false,
  spending_limit DECIMAL(15,2) DEFAULT 10000.00,
  monthly_spent DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  reference VARCHAR(30) UNIQUE NOT NULL,
  sender_account_id INTEGER REFERENCES accounts(id),
  receiver_account_id INTEGER REFERENCES accounts(id),
  amount DECIMAL(15,2) NOT NULL,
  fee DECIMAL(15,2) DEFAULT 0.00,
  note TEXT,
  category VARCHAR(50) DEFAULT 'transfer',
  status VARCHAR(20) DEFAULT 'completed',
  type VARCHAR(20) NOT NULL DEFAULT 'transfer',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Savings Goals
CREATE TABLE IF NOT EXISTS savings_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0.00,
  emoji VARCHAR(10) DEFAULT '🎯',
  deadline DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Beneficiaries (saved contacts)
CREATE TABLE IF NOT EXISTS beneficiaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  iban VARCHAR(34) NOT NULL,
  avatar VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, iban)
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  ip_address VARCHAR(50),
  device VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tx_sender ON transactions(sender_account_id);
CREATE INDEX IF NOT EXISTS idx_tx_receiver ON transactions(receiver_account_id);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_goals_user ON savings_goals(user_id);
