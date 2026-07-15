const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const api = require('@actual-app/api');
require('dotenv').config();

// Load environment variables
const {
  ACTUAL_SERVER_URL,
  ACTUAL_SERVER_PASSWORD,
  ACTUAL_SYNC_ID,
  ACTUAL_ENCRYPTION_PASSWORD,
  CRYPTO_HOLDINGS,
  CRYPTO_ACCOUNT_NAME = 'Crypto',
  ACTUAL_BUDGET_CURRENCY = 'UAH',
  BINANCE_API_KEY,
  BINANCE_API_SECRET
} = process.env;

// Validate configuration
if (!ACTUAL_SERVER_URL || !ACTUAL_SERVER_PASSWORD || !ACTUAL_SYNC_ID) {
  console.error('Error: Missing required Actual Budget configuration variables.');
  process.exit(1);
}

if (!CRYPTO_HOLDINGS && (!BINANCE_API_KEY || !BINANCE_API_SECRET)) {
  console.error('Error: Either CRYPTO_HOLDINGS or BINANCE_API_KEY & BINANCE_API_SECRET must be defined in environment.');
  process.exit(1);
}

// Sign query for Binance HMAC SHA256 signature
function signQuery(queryString, apiSecret) {
  return crypto
    .createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');
}

// Fetch balances from Binance Spot account
async function getBinanceSpotBalances(apiKey, apiSecret) {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = signQuery(query, apiSecret);
  const url = `https://api.binance.com/api/v3/account?${query}&signature=${signature}`;
  
  const res = await fetch(url, {
    headers: { 'X-MBX-APIKEY': apiKey }
  });
  if (!res.ok) {
    throw new Error(`Binance Spot API returned status ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const balances = {};
  for (const item of data.balances) {
    const free = parseFloat(item.free);
    const locked = parseFloat(item.locked);
    const total = free + locked;
    if (total > 0) {
      balances[item.asset] = total;
    }
  }
  return balances;
}

// Fetch balances from Binance Funding wallet
async function getBinanceFundingBalances(apiKey, apiSecret) {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = signQuery(query, apiSecret);
  const url = `https://api.binance.com/sapi/v1/asset/get-user-asset?${query}&signature=${signature}`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'X-MBX-APIKEY': apiKey }
    });
    if (!res.ok) {
      console.warn(`[Warning] Binance Funding wallet fetch skipped: status ${res.status}`);
      return {};
    }
    const data = await res.json();
    const balances = {};
    for (const item of data) {
      const total = parseFloat(item.free) + parseFloat(item.freeze) + parseFloat(item.withdrawing);
      if (total > 0) {
        balances[item.asset] = (balances[item.asset] || 0) + total;
      }
    }
    return balances;
  } catch (e) {
    console.warn(`[Warning] Failed to fetch Binance Funding wallet: ${e.message}`);
    return {};
  }
}

// Retrieve combined active holdings
async function getHoldings() {
  if (BINANCE_API_KEY && BINANCE_API_SECRET) {
    console.log('Fetching live balances from Binance API...');
    const spot = await getBinanceSpotBalances(BINANCE_API_KEY, BINANCE_API_SECRET);
    const funding = await getBinanceFundingBalances(BINANCE_API_KEY, BINANCE_API_SECRET);
    const combined = {};
    for (const [asset, val] of Object.entries(spot)) {
      combined[asset] = val;
    }
    for (const [asset, val] of Object.entries(funding)) {
      combined[asset] = (combined[asset] || 0) + val;
    }
    return combined;
  }

  // Fallback to static config
  console.log('Loading static holdings from CRYPTO_HOLDINGS...');
  try {
    return JSON.parse(CRYPTO_HOLDINGS);
  } catch (e) {
    console.error('Error: CRYPTO_HOLDINGS is not a valid JSON string:', e.message);
    process.exit(1);
  }
}

// Fetch crypto price from Binance Public API
async function getCryptoPriceInUSD(coin) {
  const upperCoin = coin.toUpperCase();
  if (upperCoin === 'USDT' || upperCoin === 'USD' || upperCoin === 'USDC') {
    return 1.0;
  }
  const symbol = `${upperCoin}USDT`;
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    if (!res.ok) {
      throw new Error(`Binance API returned status ${res.status}`);
    }
    const data = await res.json();
    return parseFloat(data.price);
  } catch (e) {
    console.error(`Error fetching price for ${upperCoin}:`, e.message);
    throw e;
  }
}

// Fetch USD to UAH rate from PrivatBank API
async function getUSDToUAHRate() {
  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
  const url = `https://api.privatbank.ua/p24api/exchange_rates?json&date=${formattedDate}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`PrivatBank API returned status ${res.status}`);
    const data = await res.json();
    const usdRate = data?.exchangeRate?.find(r => r.currency === 'USD');
    if (usdRate) {
      const purchaseRate = parseFloat(usdRate.purchaseRate || usdRate.purchaseRateNB);
      if (purchaseRate > 0) return purchaseRate;
    }
  } catch (e) {
    console.warn(`[Warning] Failed to fetch PrivatBank exchange rate: ${e.message}. Using default fallback rate (41.0)`);
  }
  return 41.0; // Fallback rate
}

async function run() {
  try {
    const activeHoldings = await getHoldings();
    console.log('Calculating crypto portfolio valuation...');
    let totalUSD = 0;
    const breakdownLines = [];

    // Calculate valuation for each asset
    for (const [coin, amount] of Object.entries(activeHoldings)) {
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) continue;

      const price = await getCryptoPriceInUSD(coin);
      const valueUSD = price * numericAmount;
      totalUSD += valueUSD;
      breakdownLines.push(`  - ${coin.toUpperCase()}: ${numericAmount} @ $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} = $${valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }

    const isUAH = ACTUAL_BUDGET_CURRENCY.toUpperCase() === 'UAH';
    const usdToUah = isUAH ? await getUSDToUAHRate() : 1.0;
    const totalBase = isUAH ? totalUSD * usdToUah : totalUSD;
    const currencySymbol = isUAH ? 'UAH' : 'USD';

    console.log(`Valuation complete:`);
    console.log(`  Total USD: $${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    if (isUAH) {
      console.log(`  USD/UAH Rate: ${usdToUah.toFixed(4)}`);
      console.log(`  Total UAH: ₴${totalBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }

    console.log('Connecting to Actual Budget server...');
    const dataDir = path.join(__dirname, 'actual-data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    await api.init({
      dataDir,
      serverURL: ACTUAL_SERVER_URL,
      password: ACTUAL_SERVER_PASSWORD,
    });

    const downloadOpts = ACTUAL_ENCRYPTION_PASSWORD ? { password: ACTUAL_ENCRYPTION_PASSWORD } : {};
    
    console.log(`Downloading budget ${ACTUAL_SYNC_ID}...`);
    await api.downloadBudget(ACTUAL_SYNC_ID, downloadOpts);

    let accounts = await api.getAccounts();
    const targetAccount = accounts.find(acc => acc.name.toLowerCase() === CRYPTO_ACCOUNT_NAME.toLowerCase());
    
    if (!targetAccount) {
      console.error(`Error: Account named "${CRYPTO_ACCOUNT_NAME}" was not found in your budget.`);
      console.log('Please create an Off-Budget Asset account named exactly "' + CRYPTO_ACCOUNT_NAME + '" in the UI.');
      await api.shutdown();
      process.exit(1);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Clean up any existing revaluation transaction for today to avoid duplicate entries
    console.log(`Checking for existing today's revaluation transactions...`);
    const existingTransactions = await api.getTransactions(targetAccount.id, todayStr, todayStr);
    const revalTxns = existingTransactions.filter(t => t.payee_name === 'Crypto Revaluation' || (t.payee && t.payee.name === 'Crypto Revaluation'));
    
    for (const txn of revalTxns) {
      console.log(`Deleting duplicate today's revaluation transaction: ${txn.id}`);
      await api.deleteTransaction(txn.id);
    }

    // Refetch the account balance after deletion
    const currentBalanceCents = (await api.getAccountBalance(targetAccount.id)) ?? 0;

    const targetBalanceCents = Math.round(totalBase * 100);
    const deltaCents = targetBalanceCents - currentBalanceCents;

    if (deltaCents !== 0) {
      const notes = [
        `Portfolio Revaluation (${currencySymbol})`,
        ...breakdownLines,
        isUAH ? `Total USD: $${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} @ USD/UAH: ${usdToUah.toFixed(4)}` : '',
        `Calculated Balance: ${currencySymbol} ${totalBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ].filter(Boolean).join('\n');

      const transaction = {
        date: todayStr,
        amount: deltaCents,
        payee_name: 'Crypto Revaluation',
        notes: notes,
        cleared: true,
      };

      console.log(`Adjusting balance of "${targetAccount.name}" by ${(deltaCents / 100).toFixed(2)} ${currencySymbol} (${(currentBalanceCents / 100).toFixed(2)} -> ${(targetBalanceCents / 100).toFixed(2)})`);
      await api.addTransactions(targetAccount.id, [transaction]);
      console.log('Balance adjustment successfully recorded.');
    } else {
      console.log(`Account balance is already correct at ${(targetBalanceCents / 100).toFixed(2)} ${currencySymbol}. No adjustment needed.`);
    }

    console.log('Shutting down API connection...');
    await api.shutdown();
    console.log('Crypto revaluation run completed successfully.');
  } catch (err) {
    console.error('Fatal error during crypto revaluation run:', err);
    try {
      await api.shutdown();
    } catch (_) {}
    process.exit(1);
  }
}

run();
