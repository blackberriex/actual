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
if (!MONOBANK_TOKEN || !ACTUAL_SERVER_URL || !ACTUAL_SERVER_PASSWORD || !ACTUAL_SYNC_ID) {
  console.error('Error: Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

// Check account configurations
let accountsToSync = [];
if (process.env.MONOBANK_ACCOUNTS) {
  try {
    accountsToSync = JSON.parse(process.env.MONOBANK_ACCOUNTS);
  } catch (e) {
    console.error('Error: MONOBANK_ACCOUNTS is not a valid JSON string.');
    process.exit(1);
  }
} else if (MONOBANK_ACCOUNT_ID) {
  accountsToSync = [{ monoId: MONOBANK_ACCOUNT_ID, actualName: ACTUAL_ACCOUNT_NAME }];
} else {
  console.error('Error: Please provide MONOBANK_ACCOUNTS or MONOBANK_ACCOUNT_ID in your .env file.');
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
    // 1. Initialize Actual Budget API
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
    
    // Resolve all Actual accounts
    const actualAccounts = await api.getAccounts();
    
    // 2. Loop through configured accounts
    for (let i = 0; i < accountsToSync.length; i++) {
      const acc = accountsToSync[i];
      console.log(`\n[Account ${i+1}/${accountsToSync.length}] Processing "${acc.actualName}"...`);
      
      // Sleep briefly between account statements to respect API limits
      if (i > 0) {
        console.log('Waiting 1 second to respect Monobank rate limits...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Fetch from Monobank
      const nowSec = Math.floor(Date.now() / 1000);
      const oneDayAgoSec = nowSec - (24 * 60 * 60);
      
      console.log(`Fetching Monobank statement from ${formatLocalDate(oneDayAgoSec)} to ${formatLocalDate(nowSec)}...`);
      const monoResponse = await fetch(`https://api.monobank.ua/personal/statement/${acc.monoId}/${oneDayAgoSec}/${nowSec}`, {
        headers: { 'X-Token': MONOBANK_TOKEN }
      });
      
      if (!monoResponse.ok) {
        const errText = await monoResponse.text();
        console.error(`Error fetching Monobank statement for "${acc.actualName}": ${monoResponse.status} - ${errText}`);
        continue;
      }
      
      const transactions = await monoResponse.json();
      console.log(`Fetched ${transactions.length} transactions for "${acc.actualName}".`);
      
      if (transactions.length === 0) {
        console.log(`No new transactions for "${acc.actualName}". Skipping import.`);
        continue;
      }
      
      // Resolve Actual account UUID
      const targetAccount = actualAccounts.find(a => a.name.toLowerCase() === acc.actualName.toLowerCase());
      if (!targetAccount) {
        console.error(`Error: Could not find account named "${acc.actualName}" in Actual Budget. Skipping.`);
        continue;
      }
      
      // Normalize transactions
      const normalizedTransactions = [];
      for (const tx of transactions) {
        const cleaned = cleanDescription(tx.description);
        
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
      
      // Import transactions
      console.log(`Importing ${normalizedTransactions.length} transactions into "${acc.actualName}"...`);
      await api.addTransactions(targetAccount.id, normalizedTransactions);
    }
    
    console.log('\nSyncing database with server...');
    await api.shutdown();
    
    console.log('--- Monobank Daily Sync Completed Successfully ---');
  } catch (error) {
    console.error('Sync Error:', error.message);
    process.exit(1);
  }
}

runSync();
