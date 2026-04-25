/**
 * Rate Service — fetches and caches exchange rates
 * Sources: ExchangeRate-API (USD/AZN) + CoinGecko (BTC)
 * Refreshes every 10 minutes via setInterval
 */
const pool = require('../config/database');

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

async function upsertRate(base, target, rate) {
  await pool.query(
    `INSERT INTO exchange_rates (base, target, rate, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (base, target)
     DO UPDATE SET rate = $3, updated_at = NOW()`,
    [base, target, rate]
  );
}

async function fetchFiatRates() {
  try {
    // Free ExchangeRate-API — no key needed for basic tier
    const url = `https://open.er-api.com/v6/latest/USD`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const aznRate = data.rates?.AZN;
    if (!aznRate) throw new Error('AZN rate missing from response');

    // Store USD→AZN and AZN→USD
    await upsertRate('USD', 'AZN', aznRate);
    await upsertRate('AZN', 'USD', 1 / aznRate);
    await upsertRate('USD', 'USD', 1);
    await upsertRate('AZN', 'AZN', 1);

    console.log(`[RateService] USD→AZN: ${aznRate}`);
    return aznRate;
  } catch (err) {
    console.error('[RateService] Fiat fetch failed:', err.message);
    // Fallback: use last known rate from DB
    return null;
  }
}

async function fetchBtcRate() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,azn'
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const btcUsd = data?.bitcoin?.usd;
    const btcAzn = data?.bitcoin?.azn;

    if (!btcUsd) throw new Error('BTC/USD missing');

    await upsertRate('BTC', 'USD', btcUsd);
    await upsertRate('USD', 'BTC', 1 / btcUsd);
    if (btcAzn) {
      await upsertRate('BTC', 'AZN', btcAzn);
      await upsertRate('AZN', 'BTC', 1 / btcAzn);
    }
    await upsertRate('BTC', 'BTC', 1);

    console.log(`[RateService] BTC→USD: $${btcUsd.toLocaleString()}`);
    return btcUsd;
  } catch (err) {
    console.error('[RateService] BTC fetch failed:', err.message);
    return null;
  }
}

async function refreshAll() {
  await Promise.allSettled([fetchFiatRates(), fetchBtcRate()]);
}

/**
 * Returns all current rates as a nested object:
 * { USD: { AZN: 1.7, BTC: 0.000016, USD: 1 }, AZN: {...}, BTC: {...} }
 */
async function getRates() {
  const r = await pool.query(`SELECT base, target, rate FROM exchange_rates`);
  const map = {};
  for (const row of r.rows) {
    if (!map[row.base]) map[row.base] = {};
    map[row.base][row.target] = parseFloat(row.rate);
  }
  return map;
}

/**
 * Returns the last updated_at timestamp
 */
async function getLastUpdated() {
  const r = await pool.query(`SELECT MAX(updated_at) as ts FROM exchange_rates`);
  return r.rows[0]?.ts || null;
}

/**
 * Start the background refresh loop.
 * Call once from index.js on server boot.
 */
function startRateService() {
  // Fetch immediately on boot
  refreshAll();
  // Then every 10 minutes
  setInterval(refreshAll, REFRESH_INTERVAL_MS);
  console.log('[RateService] Started — refreshing every 10 minutes');
}

module.exports = { getRates, getLastUpdated, startRateService, upsertRate };
