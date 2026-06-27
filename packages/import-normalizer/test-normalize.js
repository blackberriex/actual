const assert = require('assert');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Import the cleaning function
const normalizeScriptContent = fs.readFileSync(
  path.join(__dirname, 'normalize.js'),
  'utf-8',
);
// Extract the cleanDescription function using a simple regex or evaluating it
const cleanDescriptionMatch = normalizeScriptContent.match(
  /function cleanDescription\([\s\S]*?\n\}/,
);
if (!cleanDescriptionMatch) {
  throw new Error('Could not extract cleanDescription from normalize.js');
}
const cleanDescription = new Function(
  'desc',
  cleanDescriptionMatch[0] + '\nreturn cleanDescription(desc);',
);

// Test cleaning logic
console.log('Running tests for cleanDescription...');
const testCases = [
  {
    raw: 'EPC*EPIC GAMES STORE, Platz 10, Root D4',
    expected: 'EPIC GAMES STORE',
  },
  {
    raw: 'UBER TRIP',
    expected: 'UBER TRIP',
  },
  {
    raw: 'NETFLIX.COM',
    expected: 'NETFLIX.COM',
  },
  {
    raw: 'UNKNOWN SHOP 1234 Kyiv UA',
    expected: 'UNKNOWN SHOP 1234',
  },
  {
    raw: 'PRVT*PrivatBank, Dnipro UA',
    expected: 'PrivatBank',
  },
];

for (const tc of testCases) {
  const result = cleanDescription(tc.raw);
  console.log(`  Raw: "${tc.raw}" ➔ Cleaned: "${result}"`);
  assert.strictEqual(
    result,
    tc.expected,
    `Cleaning failed for: ${tc.raw}. Got: "${result}", Expected: "${tc.expected}"`,
  );
}
console.log('[Success] All cleanDescription unit tests passed!\n');

// Test rules matching
console.log('Testing rules.yaml parsing and matching...');
const rulesConfig = yaml.load(
  fs.readFileSync(path.join(__dirname, 'rules.yaml'), 'utf-8'),
);
assert(rulesConfig.rules.length > 0, 'rules.yaml rules should not be empty');

const testRuleMatching = [
  {
    desc: 'EPC*EPIC GAMES STORE, Platz 10, Root D4',
    matchedRule: 'EPIC GAMES',
    payee: 'Epic Games Store',
    category: 'Entertainment',
  },
  {
    desc: 'UBER TRIP',
    matchedRule: 'UBER',
    payee: 'Uber',
    category: 'Transport',
  },
  {
    desc: 'NETFLIX.COM',
    matchedRule: 'NETFLIX',
    payee: 'Netflix',
    category: 'Entertainment',
  },
  {
    desc: 'GLOVO SHOPPING',
    matchedRule: 'GLOVO',
    payee: 'Glovo',
    category: 'Food',
  },
];

for (const tc of testRuleMatching) {
  const cleaned = cleanDescription(tc.desc);
  const matched = rulesConfig.rules.find(r => {
    const regex = new RegExp(r.pattern, 'i');
    return regex.test(tc.desc) || regex.test(cleaned);
  });
  assert(matched, `Failed to match rule for: ${tc.desc}`);
  assert.strictEqual(
    matched.pattern,
    tc.matchedRule,
    `Pattern mismatch for: ${tc.desc}`,
  );
  assert.strictEqual(matched.payee, tc.payee, `Payee mismatch for: ${tc.desc}`);
  assert.strictEqual(
    matched.category,
    tc.category,
    `Category mismatch for: ${tc.desc}`,
  );
  console.log(
    `  Match success: "${tc.desc}" matched rule "${matched.pattern}" ➔ payee: "${matched.payee}", category: "${matched.category}"`,
  );
}
console.log('[Success] All rules matching tests passed!\n');
