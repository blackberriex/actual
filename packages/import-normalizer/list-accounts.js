require('dotenv').config();

const token = process.env.MONOBANK_TOKEN || process.argv[2];

if (!token) {
  console.error('Error: Please provide MONOBANK_TOKEN in .env or as an argument: node list-accounts.js <token>');
  process.exit(1);
}

async function listAccounts() {
  console.log('Fetching Monobank accounts info...');
  try {
    const response = await fetch('https://api.monobank.ua/personal/client-info', {
      headers: {
        'X-Token': token
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`API Error: ${response.status} ${response.statusText} - ${text}`);
      process.exit(1);
    }

    const data = await response.json();
    console.log(`\nClient Name: ${data.name}`);
    console.log('--------------------------------------------------');
    console.log('Available Accounts:');
    
    // ISO 4217 Currency Codes mapping
    const currencies = {
      980: 'UAH',
      840: 'USD',
      978: 'EUR'
    };

    if (data.accounts && data.accounts.length > 0) {
      data.accounts.forEach(acc => {
        const currency = currencies[acc.currencyCode] || acc.currencyCode;
        const balance = (acc.balance / 100).toFixed(2);
        const type = acc.type || 'unknown';
        const cardNumbers = acc.maskedPan ? acc.maskedPan.join(', ') : 'N/A';
        
        console.log(`ID:        ${acc.id}`);
        console.log(`Type:      ${type}`);
        console.log(`Card(s):   ${cardNumbers}`);
        console.log(`Balance:   ${balance} ${currency}`);
        console.log('--------------------------------------------------');
      });
    } else {
      console.log('No accounts found.');
    }
  } catch (error) {
    console.error('Network Error:', error);
  }
}

listAccounts();
