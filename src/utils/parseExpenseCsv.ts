import { Transaction } from '../types';

interface ChaseCsvRow {
  'Transaction Date': string;
  'Post Date': string;
  Description: string;
  Category: string;
  Type: string;
  Amount: string;
  Memo: string;
}

function parseChaseCsvRow(row: Record<string, string>): Transaction | null {
  const transactionDate = row['Transaction Date']?.trim();
  const postDate = row['Post Date']?.trim();
  const description = row.Description?.trim() || '';
  const category = row.Category?.trim() || 'Uncategorized';
  const type = row.Type?.trim() || '';
  const amountStr = row.Amount?.trim() || '0';
  const memo = row.Memo?.trim() || '';

  if (!transactionDate || !postDate) {
    return null;
  }

  const amount = parseFloat(amountStr.replace(/,/g, ''));
  if (Number.isNaN(amount)) {
    return null;
  }

  return {
    transactionDate,
    postDate,
    description,
    category,
    type,
    amount,
    memo
  };
}

export function parseExpenseCsv(csvContent: string): Transaction[] {
  const lines = csvContent.trim().split('\n');

  if (lines.length < 2) {
    return [];
  }

  const headerLine = lines[0];
  const headers = headerLine.split(',').map((header) => header.trim());

  const transactions: Transaction[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex].trim();
    if (!line) {
      continue;
    }

    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let charIndex = 0; charIndex < line.length; charIndex += 1) {
      const char = line[charIndex];

      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const transaction = parseChaseCsvRow(row);
    if (transaction) {
      transactions.push(transaction);
    }
  }

  return transactions;
}
