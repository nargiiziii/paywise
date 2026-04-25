# 💳 PayWise v2.0 — Full-Stack Banking Platform

> A powerful, production-grade online banking platform with a stunning jade & amber dark theme, comprehensive features, and clean architecture.

## Features

### Banking Core
- Real-time balance display with savings vault
- Instant money transfers with IBAN verification
- 2-step transfer confirmation with fee preview
- Atomic database transactions (no partial transfers)
- Card freeze / unfreeze with instant effect

### Analytics
- 6-month area chart (income vs spending)
- Spending breakdown by category (horizontal bar chart)
- Monthly statistics with transaction counts

### Savings Goals
- Create goals with emoji, target, and deadline
- Contribute funds directly from main balance
- Visual progress bars with percentage
- Auto-congratulation when goal is achieved

### Transaction History
- Filter by: All / Sent / Received
- Filter by category (food, travel, health, etc.)
- Sort by: Newest, Oldest, Highest/Lowest amount
- Full-text search by name or note
- Paginated results (15 per page)

### PDF Transaction Receipts
- One-click PDF receipt download for any transaction
- Branded document with PayWise logo and dark jade theme
- Includes sender and receiver full names and IBAN numbers
- Transaction amount, fee, date/time, category, and reference
- Unique 32-character verification hash for receipt authenticity
- Direction indicator (Outgoing / Incoming transfer)
- Built with **jsPDF** on the frontend (no server-side rendering needed)
- Auto-generated filename: `PayWise_Receipt_{REF}_{DATE}.pdf`

### Smart Balance Forecast (Predictive Analytics)
- Uses historical spending patterns to project future balances
- Calculates average daily spending over a 90-day rolling window
- Predicts account balance for the end of the current month
- Visual progress indicator showing current vs. projected depletion
- Real-time updates based on latest transaction data
- Built with custom analytical logic on the Node.js backend

### Disposable Virtual Cards
- Generate one-time-use virtual card numbers with labels (e.g. "Netflix", "Amazon")
- **Luhn Algorithm** for cryptographically valid card numbers (same standard as real banks)
- **SHA-256 hashed CVV** — never stored in plain text
- Cards automatically **self-destruct after first charge** — no replay attacks possible
- 24-hour expiry window for unused cards (max 5 active cards per user)
- Status tracking: `active`, `used`, `expired`

### Multi-Currency & Crypto Exchange
- **Triple Asset Support**: Seamlessly manage and exchange between **USD**, **AZN**, and **BTC** (Bitcoin).
- **Live Rate Service**: Background background workers poll external APIs (**ExchangeRate-API** for fiat, **CoinGecko** for crypto) every 10 minutes to maintain a local high-speed cache of rates.
- **Precision Engineering**: Uses `big.js` on the backend to handle floating-point arithmetic with up to 8 decimal places, ensuring zero loss of value during crypto conversions.
- **Atomic Transactions**: All exchanges utilize SQL `BEGIN/COMMIT` transactions to ensure account balances remain consistent even in case of network failures.
- **Interactive UI**:
  - **Animated Tickers**: Real-time balance updates using interpolation for smooth value transitions.
  - **Portfolio Aggregation**: Automatic calculation of total portfolio value in a base currency (AZN).
  - **Live Rates Board**: Quick-view dashboard for tracking global currency fluctuations.
- **Purpose**: Enables users to hedge against inflation with Bitcoin, manage local expenses in AZN, and handle international transactions in USD within a single unified wallet.

- Holographic card UI with chip design, reveal/hide toggle, and clipboard copy
- Charge simulation modal to test the self-destruct mechanism
- Full transaction history for all virtual card charges

### Notifications
- Real-time notification center with unread count
- Types: success, security, warning, info
- Mark all as read
- Transfer alerts and goal achievements

### Profile & Security
- Edit name, phone, address, occupation
- Change password with current password verification
- Password strength indicator on register
- Activity log with IP and device tracking
- Security status dashboard

### Virtual Card
- Virtual card display with reveal/hide details
- Card freeze toggle
- Move funds: Main ↔ Savings vault
- Monthly spending tracker with limit bar

### Beneficiaries
- Save contacts after transfers
- Quick-fill IBAN for repeat payments
- Auto-populated from seed data

---

## Setup, Launch - Step by Step

### Prerequisites
- **Node.js** v18+ → https://nodejs.org
- **PostgreSQL** v14+ → https://www.postgresql.org/download/
- **pgAdmin** (recommended GUI) or any PostgreSQL client

---

### Step 1 — Create the Database

Open **pgAdmin** (or any PostgreSQL client) and run:

```sql
CREATE DATABASE paywise;
```

Then, connect to the `paywise` database and open the file `backend/src/config/schema.sql`. Copy its entire contents and run it in the query editor. This creates 7 tables: `users`, `accounts`, `transactions`, `savings_goals`, `notifications`, `beneficiaries`, `activity_log`.

---

### Step 2 — Configure the Backend

```bash
cd backend
cp .env.example .env
```

Open `.env` and set your PostgreSQL password and username:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=paywise
DB_USER=postgres
DB_PASSWORD=your_actual_password
JWT_SECRET=paywise_ultra_secret_2024_xK9mP
JWT_EXPIRES_IN=7d
```

---

### Step 3 — Install Backend and Seed Data

```bash
cd backend
npm install
npm run seed
```

The seed command automatically creates:
- **6 test users** with accounts, virtual cards, and balances
- **80 historical transactions** with categories and dates spread over 4 months
- **Savings goals** for each user
- **Notifications** for each user
- **Saved beneficiaries** (contacts)

After seeding you'll see a table with all test accounts and their balances printed in the terminal.

---

### Step 4 — Start the Backend

```bash
npm run dev
```

API starts at: **http://localhost:5000**  
Check it works: http://localhost:5000/health

---

### Step 5 — Install & Start the Frontend

Open a **new terminal tab**:

```bash
cd frontend
npm install
npm start
```

App opens at: **http://localhost:3000**

---

## Test Accounts (after seed)

| Avatar | Name | Email | Password | Balance |
|--------|------|-------|----------|---------|
| 🧑 | Alex Morgan | alex@paywise.com | password123 | ~$24,750 |
| 👩 | Sofia Chen | sofia@paywise.com | password123 | ~$8,320 |
| 👨 | Marcus Johnson | marcus@paywise.com | password123 | ~$15,600 |
| 🧕 | Elena Rodriguez | elena@paywise.com | password123 | ~$3,200 |
| 🧔 | James Wilson | james@paywise.com | password123 | ~$52,100 |
| 👩‍💼 | Aisha Patel | aisha@paywise.com | password123 | ~$11,400 |

**To test a transfer:** Log in as Alex, go to History tab for another user to get their IBAN, then send money.

---

## API Reference

### Auth
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/register` | ✗ |
| POST | `/api/auth/login` | ✗ |
| GET | `/api/auth/me` | ✓ |
| PUT | `/api/auth/update-profile` | ✓ |
| GET | `/api/auth/activity` | ✓ |

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts/balance` | Get balance + card info |
| GET | `/api/accounts/verify/:iban` | Verify recipient IBAN |
| POST | `/api/accounts/freeze-card` | Toggle card freeze |
| POST | `/api/accounts/savings-transfer` | Move main ↔ savings |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | Paginated list (filter, sort, search) |
| GET | `/api/transactions/recent` | Last 6 transactions |
| GET | `/api/transactions/stats` | Monthly stats + categories |
| POST | `/api/transactions/transfer` | Execute transfer |

### Savings Goals
| Method | Endpoint |
|--------|----------|
| GET | `/api/savings` |
| POST | `/api/savings` |
| POST | `/api/savings/:id/contribute` |
| DELETE | `/api/savings/:id` |

### Notifications
| Method | Endpoint |
|--------|----------|
| GET | `/api/notifications` |
| POST | `/api/notifications/mark-all-read` |
| PUT | `/api/notifications/:id/read` |

### Beneficiaries
| Method | Endpoint |
|--------|----------|
| GET | `/api/beneficiaries` |
| POST | `/api/beneficiaries` |
| DELETE | `/api/beneficiaries/:id` |

---

## Security

- **bcrypt** (12 rounds) for password hashing
- **JWT tokens** with 7-day expiry
- **Rate limiting** on login/register (20 req/15min)
- **Row-level locking** (`SELECT FOR UPDATE`) for transfers
- **Atomic DB transactions** with ROLLBACK on failure
- **Input validation** on both frontend and backend
- **Self-transfer prevention**
- **Card freeze** blocks all outgoing transactions

---

## Troubleshooting

**"Cannot connect to database"**  
→ Confirm PostgreSQL is running and your `.env` credentials match

**"relation does not exist"**  
→ The schema tables weren't created. Re-open `schema.sql` in pgAdmin and run it against the `paywise` database

**Frontend blank page**  
→ Make sure backend is running on port 5000 first (the React proxy depends on it)

**Seed fails: "violates foreign key constraint"**  
→ Tables exist but in wrong order. Run the full schema.sql again to ensure all tables exist
