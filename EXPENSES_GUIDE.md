# Expenses Feature - Quick Start Guide

## Overview
A new **Expenses** tab has been added to your Portfolio Dashboard. It allows you to:
- Import Chase CSV transaction files
- View spending by category in a pie chart
- Browse and filter individual transactions
- Accumulate expenses across multiple CSV imports

## How to Use

### 1. Import Your First Expense CSV
1. Start the server: `npm run dev`
2. Navigate to the Expenses tab
3. Click **"Import Expense CSV"**
4. Either:
   - Paste the CSV content directly, or
   - Upload a Chase CSV file
5. Click **"Import Expenses"**

### 2. View Your Spending
After import, you'll see:
- **Total Spent**: Sum of all expense transactions (negative amounts only)
- **Transaction Count**: Number of transactions imported
- **Date Range**: Earliest to latest transaction date
- **Pie Chart**: Visual breakdown of spending by category with percentages

### 3. Filter Transactions
Use the filters above the transaction table to:
- **Category**: Show only specific expense categories
- **Month**: Filter by month (e.g., "December 2025")
- **Year**: Filter by year (e.g., "2025")

### 4. Import Additional CSV Files
When you import new CSV files:
- New transactions are automatically added to existing data
- Duplicates are detected and skipped (based on date, description, and amount)
- The pie chart and totals update to reflect accumulated spending
- Transaction list is sorted by date (newest first)

## Categories
The system recognizes these Chase categories:
- Groceries
- Shopping
- Food & Drink
- Gas
- Bills & Utilities
- Travel
- Entertainment
- Home
- Health & Wellness
- Automotive
- Personal
- Professional Services
- Fees & Adjustments
- Uncategorized (fallback)

Each category has a distinct color for easy visualization.

## CSV Format
The parser expects Chase CSV format with these columns:
- Transaction Date
- Post Date
- Description
- Category
- Type
- Amount
- Memo

## Data Persistence
Currently, expense data is stored **in-memory only**. When you restart the server, you'll need to re-import your CSV files. If you want persistence:
1. Save your CSV files
2. After server restart, re-import them via the UI
3. The system will deduplicate automatically

## Technical Details
- **Backend**: New `/api/expenses/import` endpoint
- **Storage**: ExpenseStore service with automatic deduplication
- **Parsing**: Custom CSV parser for Chase format
- **Chart**: Chart.js pie chart with tooltips
- **Filtering**: Client-side filtering by category, month, and year
