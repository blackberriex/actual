const fs = require('fs');
const path = require('path');
const api = require('@actual-app/api');
require('dotenv').config();

// Load environment variables
const {
  MONOBANK_TOKEN,
  MONOBANK_ACCOUNT_ID,
  ACTUAL_SERVER_URL,
  ACTUAL_SERVER_PASSWORD,
  ACTUAL_SYNC_ID,
  ACTUAL_ENCRYPTION_PASSWORD,
  ACTUAL_ACCOUNT_NAME = 'Mono Black'
} = process.env;

// Validate basic configuration
if (!MONOBANK_TOKEN || !MONOBANK_ACCOUNT_ID || !ACTUAL_SERVER_URL || !ACTUAL_SERVER_PASSWORD || !ACTUAL_SYNC_ID) {
  console.error('Error: Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

// Clean description logic matching normalize.py
function cleanDescription(desc) {
  if (!desc) return '';
  let clean = desc.trim();
  
  // 1. Remove prefixes like EPC*, PRVT*, etc.
  clean = clean.replace(/^(?:EPC\*|PRVT\*|MCC\*|CARD\s*MATCHING|VND\*|FND\*|DBT\*|CRD\*)\s*/i, '');
  
  // 2. Remove cities/country codes at the end
  clean = clean.replace(/,\s*(?:Kyiv|Kiev|Lviv|Odessa|Kharkiv|Dnipro|UA|US|DE|CH)\b.*$/i, '');
  
  // 3. Remove single words that represent cities/countries at the end
  clean = clean.replace(/\b(Kyiv|Kiev|Lviv|Odessa|Kharkiv|Dnipro|UA|US|DE|CH)\b.*$/i, '');
  
  // 4. Remove terminal codes or transaction codes
  clean = clean.replace(/\b(Terminal|Term|ID|POS)\s*[0-9A-Z]+/i, '');
  
  // 5. Remove extra commas, spaces, or dashes
  clean = clean.replace(/[\s\-,._/|]+$/, '');
  clean = clean.replace(/^[\s\-,._/|]+/, '');
  clean = clean.replace(/\s+/, ' ');
  
  return clean.trim();
}

// Rules loading and pattern matching matching normalize.py
function loadRules() {
  const rulesPath = path.join(__dirname, 'rules.json');
  if (fs.existsSync(rulesPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      return config.rules || [];
    } catch (e) {
      console.warn(`[Warning] Failed to load rules.json: ${e.message}`);
    }
  }
  return [];
}

function applyRules(rawPayee, cleanedPayee, rules) {
  let payeeName = cleanedPayee;
  let categoryName = '';
  
  for (const rule of rules) {
    if (rule.pattern) {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(rawPayee)) {
          if (rule.payee) payeeName = rule.payee;
          if (rule.category) categoryName = rule.category;
          break;
        }
      } catch (e) {
        console.warn(`[Warning] Invalid regex pattern "${rule.pattern}": ${e.message}`);
      }
    }
  }
  
  return { payeeName, categoryName };
}

// Convert Unix timestamp to local YYYY-MM-DD
function formatLocalDate(timestampSec) {
  const date = new Date(timestampSec * 1000);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function runSync() {
  console.log('--- Monobank Daily Sync Started ---');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  try {
    // 1. Fetch transactions from Monobank
    const nowSec = Math.floor(Date.now() / 1000);
    // Query last 3 days of statement to be fully safe against timezone overlaps or delays
    const threeDaysAgoSec = nowSec - (3 * 24 * 60 * 60);
    
    console.log(`Fetching Monobank statement from ${formatLocalDate(threeDaysAgoSec)} to ${formatLocalDate(nowSec)}...`);
    const monoResponse = await fetch(`https://api.monobank.ua/personal/statement/${MONOBANK_ACCOUNT_ID}/${threeDaysAgoSec}/${nowSec}`, {
      headers: { 'X-Token': MONOBANK_TOKEN }
    });
    
    if (!monoResponse.ok) {
      const errText = await monoResponse.text();
      throw new Error(`Monobank API Error: ${monoResponse.status} ${monoResponse.statusText} - ${errText}`);
    }
    
    const transactions = await monoResponse.json();
    console.log(`Fetched ${transactions.length} transactions from Monobank.`);
    
    if (transactions.length === 0) {
      console.log('No new transactions to import. Done.');
      process.exit(0);
    }
    
    // 2. Initialize Actual Budget API
    console.log('Connecting to Actual Budget server...');
    const dataDir = path.join(__dirname, 'actual-data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    await api.init({
      dataDir,
      serverURL: ACTUAL_SERVER_URL,
      password: ACTUAL_SERVER_PASSWORD
    });
    
    console.log('Downloading budget database...');
    const downloadOpts = ACTUAL_ENCRYPTION_PASSWORD ? { password: ACTUAL_ENCRYPTION_PASSWORD } : {};
    await api.downloadBudget(ACTUAL_SYNC_ID, downloadOpts);
    
    // 3. Resolve account ID
    console.log(`Resolving Actual account with name: "${ACTUAL_ACCOUNT_NAME}"...`);
    const accounts = await api.getAccounts();
    const targetAccount = accounts.find(a => a.name.toLowerCase() === ACTUAL_ACCOUNT_NAME.toLowerCase());
    if (!targetAccount) {
      throw new Error(`Could not find account named "${ACTUAL_ACCOUNT_NAME}" in Actual Budget. Available accounts: ${accounts.map(a => a.name).join(', ')}`);
    }
    console.log(`Found account UUID: ${targetAccount.id}`);
    
    // 4. Normalize transactions
    const normalizedTransactions = [];
    
    for (const tx of transactions) {
      const cleaned = cleanDescription(tx.description);
      
      // Deduct commission if present in the record
      let finalAmount = tx.amount;
      if (tx.commissionRate && tx.commissionRate > 0) {
        finalAmount -= Math.abs(tx.commissionRate);
      }
      
      normalizedTransactions.push({
        date: formatLocalDate(tx.time),
        amount: finalAmount,
        payee_name: cleaned,
        notes: tx.description,
        imported_id: tx.id
      });
    }
    
    // 6. Import transactions using Actual API
    console.log(`Importing ${normalizedTransactions.length} transactions (duplicates will be automatically skipped)...`);
    const importResult = await api.addTransactions(targetAccount.id, normalizedTransactions);
    
    console.log('Syncing database with server...');
    await api.shutdown();
    
    console.log('--- Monobank Daily Sync Completed Successfully ---');
  } catch (error) {
    console.error('Sync Error:', error.message);
    process.exit(1);
  }
}

runSync();
