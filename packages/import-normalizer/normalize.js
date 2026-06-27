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
  let fileContent = fs.readFileSync(filePath, 'utf-8');

  // Skip metadata headers if present (common in bank statements)
  const lines = fileContent.split(/\r?\n/);
  let headerLineIndex = -1;
  const searchPatterns = [/дата/i, /date/i, /опис/i, /description/i];

  for (let i = 0; i < lines.length; i++) {
    if (searchPatterns.some(p => p.test(lines[i]))) {
      headerLineIndex = i;
      break;
    }
  }

  if (headerLineIndex > 0) {
    console.log(`[CSV] Skipped ${headerLineIndex} metadata header lines.`);
    fileContent = lines.slice(headerLineIndex).join('\n');
  }

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
    card: null,
  };

  const datePatterns = [/date/i, /дата/i, /time/i, /час/i];
  const amountPatterns = [
    /amount/i,
    /сума/i,
    /value/i,
    /сума \(грн\.\)/i,
    /card amount/i,
  ];
  const payeePatterns = [
    /description/i,
    /опис/i,
    /payee/i,
    /опис операції/i,
    /raw payee/i,
    /контрагент/i,
  ];
  const cardPatterns = [/картка/i, /card/i, /номер/i];

  // Detect Date
  columnMap.date = keys.find(k => datePatterns.some(p => p.test(k)));
  // Detect Amount
  columnMap.amount = keys.find(k => amountPatterns.some(p => p.test(k)));
  // Detect Payee/Description
  columnMap.payee = keys.find(k => payeePatterns.some(p => p.test(k)));
  // Detect Card
  columnMap.card = keys.find(k => cardPatterns.some(p => p.test(k)));

  if (!columnMap.date || !columnMap.amount || !columnMap.payee) {
    console.error('Available keys:', keys);
    throw new Error(
      `Failed to auto-detect columns. Detected: Date(${columnMap.date}), Amount(${columnMap.amount}), Payee(${columnMap.payee})`,
    );
  }

  console.log(
    `[Auto-detect] Mapped CSV headers: Date -> "${columnMap.date}", Amount -> "${columnMap.amount}", Description -> "${columnMap.payee}"${columnMap.card ? `, Card -> "${columnMap.card}"` : ''}`,
  );

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
      card: columnMap.card ? row[columnMap.card] : '',
    };
  });
}

// Regex payee cleaning logic
function cleanDescription(desc) {
  if (!desc) return '';
  let clean = desc.trim();

  // 1. Remove prefixes like EPC*, MCC*, CARD MATCHING, etc.
  clean = clean.replace(
    /^(EPC\*|MCC\*|PRVT\*|CARD\*|CARD MATCHING\*|Покупка:|Оплата:|Переказ:)\s*/i,
    '',
  );

  // 2. Remove trailing address blocks like ", Platz 10, Root D4", ", Dnipro UA", etc.
  clean = clean.replace(
    /,\s*(?:Platz\s+\d+|St|Street|Ave|Avenue|Rd|Road|Term|POS)?\s*[^,]+,\s*[^,]+$/i,
    '',
  );
  clean = clean.replace(
    /,\s*[^,]+(?:\s+UA|\s+US|\s+DE|\s+CH|\s+Kyiv|\s+Kiev|\s+Lviv|\s+Odessa|\s+Dnipro)$/gi,
    '',
  );
  clean = clean.replace(
    /,\s*(?:Kyiv|Kiev|Lviv|Odessa|Kharkiv|Dnipro|UA|US|DE|CH)\b.*$/gi,
    '',
  );

  // 3. Remove single words that represent cities/countries at the end
  clean = clean.replace(
    /\b(Kyiv|Kiev|Lviv|Odessa|Kharkiv|Dnipro|UA|US|DE|CH)\b.*$/gi,
    '',
  );

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
    console.error(
      'Usage: node normalize.js --file <path-to-csv> [--out <output-normalized-csv>] [--account <account-name>] [--budget <budget-name>] [--server <server-url>] [--password <sync-password>] [--dry-run]',
    );
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
  console.log(
    `[CSV] Parsed ${rawTransactions.length} transactions from statement.`,
  );

  // Determine Mode: Offline (file output) or Online (push to Actual Server)
  const password = args.password || process.env.ACTUAL_SERVER_PASSWORD;
  const isOffline = !!args.out || (!password && !args.server);

  let categories = [];
  let payees = [];
  const learnedMappings = new Map();
  let account = null;
  let allExistingTransactions = [];

  if (isOffline) {
    console.log(
      `[Mode] Running in OFFLINE mode. Transactions will be saved as normalized CSV.`,
    );
  } else {
    console.log(`[Mode] Running in ONLINE mode. Connecting to Actual API.`);
    const serverURL =
      args.server ||
      process.env.ACTUAL_SERVER_URL ||
      'https://vault.tailcbd54c.ts.net';
    const budgetName = args.budget || process.env.ACTUAL_BUDGET_NAME;
    const accountName = args.account;

    if (!accountName) {
      console.error(
        'Error: Account name (--account) is required for online import.',
      );
      process.exit(1);
    }

    try {
      await api.init({ serverURL, password });
      const budgets = await api.getBudgets();
      let targetBudget = budgets[0];
      if (budgetName) {
        targetBudget = budgets.find(
          b => b.name === budgetName || b.id === budgetName,
        );
      }
      if (!targetBudget) {
        throw new Error('No budgets found or target budget not matched.');
      }
      console.log(`[API] Opening Budget: "${targetBudget.name}"`);
      await api.downloadBudget(targetBudget.id);

      categories = await api.getCategories();
      payees = await api.getPayees();

      const accounts = await api.getAccounts();
      account = accounts.find(
        a => a.name === accountName || a.id === accountName,
      );
      if (!account) {
        throw new Error(`Account "${accountName}" not found.`);
      }

      console.log('[API] Querying transaction history for learning loop...');
      allExistingTransactions = await api.getTransactions(
        account.id,
        '2020-01-01',
        '2030-12-31',
      );
      for (const tx of allExistingTransactions) {
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
      console.log(
        `[Learning Loop] Loaded ${learnedMappings.size} learned patterns.`,
      );
    } catch (e) {
      console.error(
        `[API Error] Failed to initialize connection: ${e.message}. Falling back to offline mode.`,
      );
    }
  }

  // Mapping normalized transactions
  const normalizedToImport = [];
  const unmatchedLog = [];
  const csvOutputRows = [];

  console.log('\n--- Normalizing transactions ---');
  for (const tx of rawTransactions) {
    const rawDesc = tx.rawDescription;
    const cleanedPayee = cleanDescription(rawDesc);

    let finalPayeeName = cleanedPayee;
    let finalCategoryName = '';
    let finalCategoryId = null;
    let finalPayeeId = null;
    let mappingSource = 'Cleaned Raw';

    // Extract card last 4 digits
    const cardMatch = tx.card.match(/(\d{4})$/);
    const cardDigits = cardMatch ? cardMatch[1] : '';
    const resolvedAccount =
      cardDigits && config.cards && config.cards[cardDigits]
        ? config.cards[cardDigits]
        : accountName || 'Privat UAH';

    // 0. Detect transfers between own accounts
    let isTransfer = false;
    let transferAccount = '';
    if (config.transfer_rules) {
      for (const rule of config.transfer_rules) {
        const regex = new RegExp(rule.pattern, 'i');
        const match = rawDesc.match(regex);
        if (match) {
          const targetCardDigits = match[1];
          const destAccount =
            config.cards && config.cards[targetCardDigits]
              ? config.cards[targetCardDigits]
              : null;
          if (destAccount) {
            isTransfer = true;
            transferAccount = destAccount;
            finalPayeeName = `Transfer: ${destAccount}`;
            mappingSource = 'Transfer Rule';
            break;
          }
        }
      }
    }

    if (!isTransfer) {
      // 1. Check Learning Loop (Exact matching based on history)
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
            finalCategoryName = translated;
          }
        }
      }
    }

    // Resolve category/payee IDs if online
    if (!isOffline) {
      if (isTransfer && transferAccount) {
        const destAccountObj = accounts.find(
          a => a.name === transferAccount || a.id === transferAccount,
        );
        if (destAccountObj) {
          finalPayeeId = `transfer:${destAccountObj.id}`;
        }
      }

      if (finalCategoryName && !finalCategoryId) {
        const matchedCat = categories.find(
          c => c.name.toLowerCase() === finalCategoryName.toLowerCase(),
        );
        if (matchedCat) finalCategoryId = matchedCat.id;
      }
      if (finalPayeeName && !finalPayeeId) {
        const matchedPayee = payees.find(
          p => p.name.toLowerCase() === finalPayeeName.toLowerCase(),
        );
        if (matchedPayee) finalPayeeId = matchedPayee.id;
      }
    }

    // Formatting date (YYYY-MM-DD)
    let isoDate = tx.date;
    const dateOnly = tx.date.split(' ')[0];
    if (/\d{2}\.\d{2}\.\d{4}/.test(dateOnly)) {
      const [d, m, y] = dateOnly.split('.');
      isoDate = `${y}-${m}-${d}`;
    }

    // Cent amount for Actual API
    const amountInCents = Math.round(tx.amount * 100);

    // If online, use resolved targetAccount to import into
    let finalAccountId = account ? account.id : null;
    if (!isOffline && accountName) {
      const routedAccount = accounts.find(
        a => a.name === resolvedAccount || a.id === resolvedAccount,
      );
      if (routedAccount) {
        finalAccountId = routedAccount.id;
      }
    }

    normalizedToImport.push({
      account: finalAccountId, // We route to correct account ID
      date: isoDate,
      amount: amountInCents,
      payee: finalPayeeId,
      payee_name: finalPayeeId ? undefined : finalPayeeName,
      category: finalCategoryId,
      imported_payee: rawDesc,
      notes: `Imported raw: ${rawDesc}`,
      cleared: true,
    });

    // Save output row for Offline CSV
    csvOutputRows.push({
      account: resolvedAccount,
      date: isoDate,
      payee: finalPayeeName,
      category: finalCategoryName,
      amount: tx.amount,
      notes: rawDesc,
    });

    console.log(
      `➔ ${tx.date} | ${tx.amount.toFixed(2)} | "${rawDesc.slice(0, 30)}"`,
    );
    console.log(
      `  └ Payee: "${finalPayeeName}" | Category: "${finalCategoryName || 'Uncategorized'}" | Source: ${mappingSource}`,
    );

    if (isOffline) {
      if (!finalCategoryName) {
        unmatchedLog.push({
          date: tx.date,
          amount: tx.amount,
          raw: rawDesc,
          cleaned: cleanedPayee,
        });
      }
    } else {
      if (!finalCategoryId) {
        unmatchedLog.push({
          date: tx.date,
          amount: tx.amount,
          raw: rawDesc,
          cleaned: cleanedPayee,
        });
      }
    }
  }

  console.log('--------------------------------\n');

  // Handle Unmatched transactions report
  if (unmatchedLog.length > 0) {
    const unmatchedCsvFile = path.resolve(
      path.dirname(csvFile),
      'unmatched.csv',
    );
    const csvHeader = 'date,amount,raw_description,cleaned_description\n';
    const csvRows = unmatchedLog
      .map(
        x =>
          `"${x.date}","${x.amount}","${x.raw.replace(/"/g, '""')}","${x.cleaned.replace(/"/g, '""')}"`,
      )
      .join('\n');
    fs.writeFileSync(unmatchedCsvFile, csvHeader + csvRows, 'utf-8');
    console.log(
      `[Unmatched] Saved ${unmatchedLog.length} uncategorized transactions to: ${unmatchedCsvFile}`,
    );
  }

  // Handle Normalized CSV output file
  if (args.out) {
    const normalizedCsvFile = path.resolve(args.out);
    const csvHeader = 'Account,Date,Payee,Category,Amount,Notes\n';
    const csvRows = csvOutputRows
      .map(
        x =>
          `"${x.account}","${x.date}","${x.payee.replace(/"/g, '""')}","${x.category.replace(/"/g, '""')}","${x.amount.toFixed(2)}","${x.notes.replace(/"/g, '""')}"`,
      )
      .join('\n');
    fs.writeFileSync(normalizedCsvFile, csvHeader + csvRows, 'utf-8');
    console.log(
      `[Output] Successfully wrote normalized CSV file to: ${normalizedCsvFile}`,
    );
  }

  // Online API Push
  if (!isOffline) {
    if (args['dry-run']) {
      console.log(`[Dry-Run] Simulation complete. Did not push to server.`);
      await api.shutdown();
    } else {
      console.log(
        `[Import] Syncing and pushing ${normalizedToImport.length} transactions to Actual...`,
      );
      const existingTxSet = new Set(
        allExistingTransactions.map(
          t => `${t.date}_${t.amount}_${t.imported_payee}`,
        ),
      );

      const filteredToImport = normalizedToImport.filter(t => {
        const key = `${t.date}_${t.amount}_${t.imported_payee}`;
        const isDuplicate = existingTxSet.has(key);
        if (isDuplicate) {
          console.log(
            `  [Skip Duplicate] ${t.date} | ${(t.amount / 100).toFixed(2)} | "${t.imported_payee}"`,
          );
        }
        return !isDuplicate;
      });

      if (filteredToImport.length > 0) {
        await api.addTransactions(account.id, filteredToImport);
        console.log(
          `[Import] Success! Imported ${filteredToImport.length} new transactions.`,
        );
      } else {
        console.log('[Import] No new transactions to import.');
      }
      await api.shutdown();
    }
  }
}

main();
