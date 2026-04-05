import path from 'node:path';
import fs from 'node:fs/promises';
import { ExpenseData, ExpenseCategory, Transaction } from '../types';
import { parseExpenseCsv } from '../utils/parseExpenseCsv';

const CATEGORY_COLORS: Record<string, string> = {
  'Groceries': '#4CAF50',
  'Shopping': '#2196F3',
  'Food & Drink': '#FF9800',
  'Gas': '#F44336',
  'Bills & Utilities': '#9C27B0',
  'Travel': '#00BCD4',
  'Entertainment': '#E91E63',
  'Home': '#795548',
  'Health & Wellness': '#8BC34A',
  'Automotive': '#607D8B',
  'Personal': '#FFC107',
  'Professional Services': '#3F51B5',
  'Fees & Adjustments': '#9E9E9E',
  'Uncategorized': '#757575'
};

export class ExpenseStore {
  private transactions: Transaction[] = [];
  private dataFilePath: string;

  constructor(dataDirectory?: string) {
    const projectRoot = path.resolve(__dirname, '..');
    const dataDir = dataDirectory || path.join(projectRoot, 'data');
    this.dataFilePath = path.join(dataDir, 'expenses.json');
  }

  async initialize(): Promise<void> {
    try {
      const fileContent = await fs.readFile(this.dataFilePath, 'utf-8');
      const data = JSON.parse(fileContent);
      if (Array.isArray(data.transactions)) {
        this.transactions = data.transactions;
      }
    } catch (error) {
      // File doesn't exist or is invalid, start with empty transactions
      this.transactions = [];
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const dataDir = path.dirname(this.dataFilePath);
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(
        this.dataFilePath,
        JSON.stringify({ transactions: this.transactions }, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save expense data:', error);
    }
  }

  async importCsv(csvContent: string): Promise<void> {
    const newTransactions = parseExpenseCsv(csvContent);

    // Add new transactions and remove duplicates based on transaction date, description, and amount
    const existingKeys = new Set(
      this.transactions.map((transaction) =>
        `${transaction.transactionDate}|${transaction.description}|${transaction.amount}`
      )
    );

    newTransactions.forEach((transaction) => {
      const key = `${transaction.transactionDate}|${transaction.description}|${transaction.amount}`;
      if (!existingKeys.has(key)) {
        this.transactions.push(transaction);
        existingKeys.add(key);
      }
    });

    // Sort transactions by date (newest first)
    this.transactions.sort((a, b) => {
      const dateA = new Date(a.transactionDate);
      const dateB = new Date(b.transactionDate);
      return dateB.getTime() - dateA.getTime();
    });

    // Persist to file
    await this.saveToFile();
  }

  getExpenseData(): ExpenseData {
    if (this.transactions.length === 0) {
      return {
        transactions: [],
        categories: [],
        totalSpent: 0,
        startDate: null,
        endDate: null
      };
    }

    // Calculate category totals (only negative amounts are expenses, excluding Payment type)
    const categoryTotals = new Map<string, { total: number; count: number }>();
    let totalSpent = 0;

    this.transactions.forEach((transaction) => {
      // Only count negative amounts as expenses (positive are returns/payments)
      // Also exclude transactions with type "Payment"
      if (transaction.amount < 0 && transaction.type !== 'Payment') {
        const absAmount = Math.abs(transaction.amount);
        const category = transaction.category || 'Uncategorized';

        const existing = categoryTotals.get(category) || { total: 0, count: 0 };
        categoryTotals.set(category, {
          total: existing.total + absAmount,
          count: existing.count + 1
        });

        totalSpent += absAmount;
      }
    });

    // Convert to array and calculate percentages
    const categories: ExpenseCategory[] = Array.from(categoryTotals.entries())
      .map(([name, { total, count }]) => ({
        name,
        total,
        count,
        percentage: totalSpent > 0 ? (total / totalSpent) * 100 : 0,
        color: CATEGORY_COLORS[name] || CATEGORY_COLORS.Uncategorized
      }))
      .sort((a, b) => b.total - a.total);

    // Find date range
    const dates = this.transactions
      .map((transaction) => new Date(transaction.transactionDate).getTime())
      .filter((time) => !Number.isNaN(time));

    const startDate = dates.length > 0 ? new Date(Math.min(...dates)).toISOString().split('T')[0] : null;
    const endDate = dates.length > 0 ? new Date(Math.max(...dates)).toISOString().split('T')[0] : null;

    return {
      transactions: this.transactions,
      categories,
      totalSpent,
      startDate,
      endDate
    };
  }

  clearAll(): void {
    this.transactions = [];
  }
}
