import { ExpenseData, ExpenseViewModel, TransactionRowViewModel } from '../types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) {
    return 'No transactions';
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const startFormatted = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endFormatted = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return `${startFormatted} - ${endFormatted}`;
}

export function buildExpenseViewModel(expenseData: ExpenseData): ExpenseViewModel {
  const categoryColorMap = new Map(
    expenseData.categories.map((category) => [category.name, category.color])
  );

  const transactions: TransactionRowViewModel[] = expenseData.transactions.map((transaction) => {
    const isExpense = transaction.amount < 0;
    const absAmount = Math.abs(transaction.amount);

    return {
      transactionDate: transaction.transactionDate,
      postDate: transaction.postDate,
      description: transaction.description,
      category: transaction.category,
      categoryColor: categoryColorMap.get(transaction.category) || '#757575',
      type: transaction.type,
      amount: (isExpense ? '-' : '+') + formatCurrency(absAmount),
      amountClass: isExpense ? 'expense' : 'income',
      memo: transaction.memo
    };
  });

  return {
    categories: expenseData.categories,
    transactions,
    totalSpent: formatCurrency(expenseData.totalSpent),
    transactionCount: expenseData.transactions.length,
    dateRange: formatDateRange(expenseData.startDate, expenseData.endDate)
  };
}
