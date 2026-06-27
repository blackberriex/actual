#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const yaml = require('js-yaml');
const api = require('@actual-app/api');

// Helper to parse arguments
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextVal = process.argv[i + 1];
      if (nextVal && !nextVal.startsWith('--')) {
        args[key] = nextVal;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

// Helper to detect CSV headers and parse rows
function parseCSV(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  // Parse with csv-parse
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Auto-detect columns based on common patterns
  const firstRecord = records[0];
  const keys = Object.keys(firstRecord);

  const columnMap = {
    date: null,
    amount: null,
    payee: null,
  };

  const datePatterns = [/date/i, /дата/i, /time/i, /час/i];
  const amountPatterns = [/amount/i, /сума/i, /value/i, /сума \(грн\.\)/i, /card amount/i];
  const payeePatterns = [/description/i, /опис/i, /payee/i, /опис операції/i, /raw payee/i, /контрагент/i];

  // Detect Date
  columnMap.date = keys.find(k => datePatterns.some(p => p.test(k)));
  // Detect Amount
  columnMap.amount = keys.find(k => amountPatterns.some(p => p.test(k)));
  // Detect Payee/Description
  columnMap.payee = keys.find(k => payeePatterns.some(p => p.test(k)));

  if (!columnMap.date || !columnMap.amount || !columnMap.payee) {
    console.error('Available keys:', keys);
    throw new Error(`Failed to auto-detect columns. Detected: Date(${columnMap.date}), Amount(${columnMap.amount}), Payee(${columnMap.payee})`);
  }

  console.log(`[Auto-detect] Mapped CSV headers: Date -> "${columnMap.date}", Amount -> "${columnMap.amount}", Description -> "${columnMap.payee}"`);

  return records.map(row => {
    let rawAmount = row[columnMap.amount];
    // Normalize amount string to float (handling commas as decimal separators, stripping spaces)
    if (typeof rawAmount === 'string') {
      rawAmount = rawAmount.replace(/\s/g, '').replace(/,/g, '.');
    }
    const amountFloat = parseFloat(rawAmount);

    return {
      date: row[columnMap.date],
      amount: amountFloat,
      rawDescription: row[columnMap.payee],
    };
  });
}

// Regex payee cleaning logic
function cleanDescription(desc) {
  if (!desc) return '';
  let clean = desc.trim();

  // 1. Remove prefixes like EPC*, MCC*, CARD MATCHING, etc.
  clean = clean.replace(/^(EPC\*|MCC\*|PRVT\*|CARD\*|CARD MATCHING\*|Покупка:|Оплата:|Переказ:)\s*/i, '');

  // 2. Remove trailing address blocks like ", Platz 10, Root D4", ", Dnipro UA", etc.
  clean = clean.replace(/,\s*(?:Platz\s+\d+|St|Street|Ave|Avenue|Rd|Road|Term|POS)?\s*[^,]+,\s*[^,]+$/i, '');
  clean = clean.replace(/,\s*[^,]+(?:\s+UA|\s+US|\s+DE|\s+CH|\s+Kyiv|\s+Kiev|\s+Lviv|\s+Odessa|\s+Dnipro)$/gi, '');
  clean = clean.replace(/,\s*(?:Kyiv|Kiev|Lviv|Odessa|Kharkiv|Dnipro|UA|US|DE|CH)\b.*$/gi, '');

  // 3. Remove single words that represent cities/countries at the end
  clean = clean.replace(/\b(Kyiv|Kiev|Lviv|Odessa|Kharkiv|Dnipro|UA|US|DE|CH)\b.*$/gi, '');

  // 4. Remove terminal codes or transaction codes
  clean = clean.replace(/\b(Terminal|Term|ID|POS)\s*[0-9A-Z]+/gi, '');

  // 5. Remove extra commas, spaces, or dashes
  clean = clean.replace(/[\s\-,._/|]+$/g, '');
  clean = clean.replace(/^\s*[\s\-,._/|]+/g, '');
  clean = clean.replace(/\s+/g, ' ');

  return clean.trim();
}

async function main() {
  const args = parseArgs();

  if (!args.file) {
    console.error('Usage: node normalize.js --file <path-to-csv> --account <account-name-or-id> [--budget <budget-name>] [--server <server-url>] [--password <sync-password>] [--dry-run]');
    process.exit(1);
  }

  const csvFile = path.resolve(args.file);
  if (!fs.existsSync(csvFile)) {
    console.error(`File not found: ${csvFile}`);
    process.exit(1);
  }

  // Load custom rules from rules.yaml
  let config = { rules: [], category_translations: {} };
  const rulesPath = path.resolve(__dirname, 'rules.yaml');
  if (fs.existsSync(rulesPath)) {
    try {
      config = yaml.load(fs.readFileSync(rulesPath, 'utf-8')) || config;
      console.log(`[Config] Loaded rules configuration from ${rulesPath}`);
    } catch (e) {
      console.warn(`[Warning] Failed to parse rules.yaml: ${e.message}`);
    }
  }

  // Parse and normalize CSV rows
  const rawTransactions = parseCSV(csvFile);
  console.log(`[CSV] Parsed ${rawTransactions.length} transactions from statement.`);

  // Actual Server parameters (with Tailscale home server defaults)
  const serverURL = args.server || process.env.ACTUAL_SERVER_URL || 'https://vault.tailcbd54c.ts.net';
  const password = args.password || process.env.ACTUAL_SERVER_PASSWORD;
  const budgetName = args.budget || process.env.ACTUAL_BUDGET_NAME;
  const accountName = args.account;

  if (!accountName) {
    console.error('Error: Account name (--account) is required.');
    process.exit(1);
  }

  if (!args['dry-run'] && !password) {
    console.error('Error: Sync server password (--password) is required for real import.');
    process.exit(1);
  }

  console.log(`[API] Connecting to Actual Sync Server at: ${serverURL}`);

  try {
    // Connect to Actual API
    await api.init({ serverURL, password });
    
    // Find and open correct budget
    const budgets = await api.getBudgets();
    let targetBudget = budgets[0];
    if (budgetName) {
      targetBudget = budgets.find(b => b.name === budgetName || b.id === budgetName);
      if (!targetBudget) {
        throw new Error(`Budget "${budgetName}" not found. Available: ${budgets.map(b => b.name).join(', ')}`);
      }
    }
    
    if (!targetBudget) {
      throw new Error('No budgets found on actual server.');
    }

    console.log(`[API] Opening Budget: "${targetBudget.name}"`);
    await api.downloadBudget(targetBudget.id);

    // Get categories and build maps
    const categories = await api.getCategories();
    const payees = await api.getPayees();
    
    // Find account
    const accounts = await api.getAccounts();
    const account = accounts.find(a => a.name === accountName || a.id === accountName);
    if (!account) {
      throw new Error(`Account "${accountName}" not found. Available: ${accounts.map(a => a.name).join(', ')}`);
    }
    console.log(`[API] Mapped account: "${account.name}" (ID: ${account.id})`);

    // Fetch existing transactions to build the Learning Loop
    console.log('[API] Downloading historical transactions for automatic learning loop...');
    const allExistingTransactions = await api.getTransactions(account.id, '2020-01-01', '2030-12-31');

    // Build the learned mappings map: imported_payee -> { payeeName, categoryName }
    const learnedMappings = new Map();
    for (const tx of allExistingTransactions) {
      // If we have an imported payee (raw bank description) and it has been matched/categorized
      if (tx.imported_payee && tx.payee && tx.category) {
        const payeeObj = payees.find(p => p.id === tx.payee);
        const catObj = categories.find(c => c.id === tx.category);
        if (payeeObj && catObj) {
          learnedMappings.set(tx.imported_payee.trim(), {
            payeeName: payeeObj.name,
            categoryName: catObj.name,
            categoryId: catObj.id,
            payeeId: payeeObj.id,
          });
        }
      }
    }
    console.log(`[Learning Loop] Built mapping database with ${learnedMappings.size} learned patterns from history.`);

    // Mapping normalized transactions
    const normalizedToImport = [];
    const unmatchedLog = [];

    console.log('\n--- Normalizing transactions ---');
    for (const tx of rawTransactions) {
      const rawDesc = tx.rawDescription;
      const cleanedPayee = cleanDescription(rawDesc);
      
      let finalPayeeName = cleanedPayee;
      let finalCategoryName = '';
      let finalCategoryId = null;
      let finalPayeeId = null;
      let mappingSource = 'Cleaned Raw';

      // 1. Check Learning Loop first (Exact matching based on user's history)
      if (learnedMappings.has(rawDesc.trim())) {
        const learned = learnedMappings.get(rawDesc.trim());
        finalPayeeName = learned.payeeName;
        finalCategoryName = learned.categoryName;
        finalCategoryId = learned.categoryId;
        finalPayeeId = learned.payeeId;
        mappingSource = 'Learned';
      } 
      // 2. Check rules.yaml configuration
      else {
        const matchingRule = config.rules.find(r => {
          const regex = new RegExp(r.pattern, 'i');
          return regex.test(rawDesc) || regex.test(cleanedPayee);
        });

        if (matchingRule) {
          finalPayeeName = matchingRule.payee;
          finalCategoryName = matchingRule.category;
          mappingSource = 'rules.yaml';

          // Translate category if needed (Ukrainian/English matching support)
          if (config.category_translations[finalCategoryName]) {
            const translated = config.category_translations[finalCategoryName];
            // Check if translated exists in DB
            const translatedCat = categories.find(c => c.name.toLowerCase() === translated.toLowerCase());
            if (translatedCat) {
              finalCategoryId = translatedCat.id;
              finalCategoryName = translatedCat.name;
            }
          }
        }
      }

      // If category name was found but categoryId is not resolved yet, search categories
      if (finalCategoryName && !finalCategoryId) {
        const matchedCat = categories.find(c => c.name.toLowerCase() === finalCategoryName.toLowerCase());
        if (matchedCat) {
          finalCategoryId = matchedCat.id;
        }
      }

      // Resolve Payee ID (create or match)
      if (finalPayeeName && !finalPayeeId) {
        const matchedPayee = payees.find(p => p.name.toLowerCase() === finalPayeeName.toLowerCase());
        if (matchedPayee) {
          finalPayeeId = matchedPayee.id;
        }
      }

      // Formatting amount to cents (Actual Budget handles currency as integers, 1.00 -> 100)
      // Note: Actual API addTransactions expects amount in cents (integer).
      const amountInCents = Math.round(tx.amount * 100);

      // Parse date to standard YYYY-MM-DD
      let isoDate = tx.date;
      // Handle DD.MM.YYYY formats common in UA statements
      if (/\d{2}\.\d{2}\.\d{4}/.test(tx.date)) {
        const [d, m, y] = tx.date.split('.');
        isoDate = `${y}-${m}-${d}`;
      }

      normalizedToImport.push({
        date: isoDate,
        amount: amountInCents,
        payee: finalPayeeId,
        payee_name: finalPayeeId ? undefined : finalPayeeName, // Create new payee if id is absent
        category: finalCategoryId,
        imported_payee: rawDesc,
        notes: `Imported raw: ${rawDesc}`,
        cleared: true,
      });

      console.log(`➔ ${tx.date} | ${tx.amount.toFixed(2)} | "${rawDesc.slice(0, 30)}"`);
      console.log(`  └ Payee: "${finalPayeeName}" | Category: "${finalCategoryName || 'Uncategorized'}" | Source: ${mappingSource}`);

      if (!finalCategoryId) {
        unmatchedLog.push({ date: tx.date, amount: tx.amount, raw: rawDesc, cleaned: cleanedPayee });
      }
    }

    console.log('--------------------------------\n');

    // Handle Unmatched transactions report
    if (unmatchedLog.length > 0) {
      const unmatchedCsvFile = path.resolve(path.dirname(csvFile), 'unmatched.csv');
      const csvHeader = 'date,amount,raw_description,cleaned_description\n';
      const csvRows = unmatchedLog.map(x => `"${x.date}","${x.amount}","${x.raw.replace(/"/g, '""')}","${x.cleaned.replace(/"/g, '""')}"`).join('\n');
      fs.writeFileSync(unmatchedCsvFile, csvHeader + csvRows, 'utf-8');
      console.log(`[Unmatched] Saved ${unmatchedLog.length} uncategorized transactions to: ${unmatchedCsvFile}`);
    }

    // Executing the import
    if (args['dry-run']) {
      console.log(`[Dry-Run] Simulation complete. Did not push any transactions to server.`);
    } else {
      console.log(`[Import] Syncing and pushing ${normalizedToImport.length} transactions to Actual...`);
      
      // Deduplicate transactions (simple check for same date + amount + raw_payee within existing transactions)
      const existingTxSet = new Set(
        allExistingTransactions.map(t => `${t.date}_${t.amount}_${t.imported_payee}`)
      );

      const filteredToImport = normalizedToImport.filter(t => {
        const key = `${t.date}_${t.amount}_${t.imported_payee}`;
        const isDuplicate = existingTxSet.has(key);
        if (isDuplicate) {
          console.log(`  [Skip Duplicate] ${t.date} | ${(t.amount / 100).toFixed(2)} | "${t.imported_payee}"`);
        }
        return !isDuplicate;
      });

      if (filteredToImport.length > 0) {
        const result = await api.addTransactions(account.id, filteredToImport);
        console.log(`[Import] Success! Successfully imported ${filteredToImport.length} new transactions.`);
      } else {
        console.log('[Import] No new transactions to import (all skipped as duplicates).');
      }

      await api.shutdown();
    }
  } catch (e) {
    console.error(`[Error] Normalizer run failed: ${e.message}`);
    console.error(e);
    process.exit(1);
  }
}

main();
