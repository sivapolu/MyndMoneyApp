# MyndMoney - Smart Finance Tracker

## Overview
MyndMoney is a comprehensive personal finance tracking application with AI-powered expense parsing, budgeting tools, and multi-currency support. Built with a beautiful, modern UI following professional design guidelines.

## Current State (October 9, 2025)
✅ **MVP Complete and Tested**
- All core features implemented and working
- End-to-end testing passed successfully
- Responsive design with light/dark theme support
- AI integration with defensive fallback handling

## Recent Changes
- **Schema & Frontend (Task 1)**: Defined complete data models for transactions, budgets, accounts, goals, and categories. Built all React components with exceptional visual quality following design_guidelines.md
- **Backend Implementation (Task 2)**: Implemented all API endpoints, OpenAI AI integration with fallback parsing, currency exchange rate API, and business logic
- **Integration & Testing (Task 3)**: Connected frontend to backend, fixed schema validation issues, implemented proper type coercion, and successfully tested all features

## Features

### Core MVP Features
1. **Dashboard**
   - Hero balance card with privacy toggle
   - Monthly income, expenses, and savings statistics
   - Spending by category pie chart
   - Monthly trend line chart
   - Recent transactions list
   - Budget alerts for exceeded limits

2. **AI-Powered Expense Entry**
   - Chat-style natural language input
   - OpenAI GPT-5 parsing (with regex fallback)
   - Auto-categorization of expenses
   - Transaction preview and confirmation
   - Quick suggestion buttons

3. **Account Management**
   - Support for cash, card, wallet, and crypto accounts
   - Multi-currency support (INR, USD, EUR)
   - Real-time exchange rates via API
   - Total balance aggregation

4. **Budget Planning**
   - Category-wise budget creation
   - Visual progress bars
   - Alert thresholds (50%, 80%, 100%)
   - Period options (weekly, monthly, yearly)
   - Spending vs budget tracking

5. **Savings Goals**
   - Goal creation with target amounts
   - Progress tracking
   - Deadline management
   - Achievement indicators

6. **Settings**
   - Theme toggle (light/dark mode)
   - Notification preferences
   - Privacy controls

### Technical Stack
- **Frontend**: React, Wouter, TanStack Query, Shadcn UI, Tailwind CSS
- **Backend**: Express.js, In-memory storage
- **AI**: OpenAI GPT-5 via Replit AI Integrations (with regex fallback)
- **APIs**: Exchange Rate API for currency conversion

## Project Architecture

### Data Model
- **Categories**: Pre-populated expense/income categories with icons and colors
- **Accounts**: Financial accounts with balance tracking
- **Transactions**: Expense/income records with auto balance updates
- **Budgets**: Category-wise spending limits with alerts
- **Goals**: Savings targets with progress tracking

### Schema Validation
All insert schemas use Zod with proper type coercion:
- `z.coerce.number()` for decimal fields
- `z.coerce.date()` for timestamp fields
- Validated request bodies in all API endpoints

### Key API Endpoints
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/categories` - All categories
- `POST /api/accounts` - Create account
- `POST /api/transactions` - Create transaction
- `POST /api/budgets` - Create budget
- `POST /api/goals` - Create goal
- `POST /api/chat/parse` - AI expense parsing
- `GET /api/exchange-rates/:base` - Currency rates
- `POST /api/convert-currency` - Currency conversion

### Storage Implementation
- In-memory storage with proper decimal/string conversions
- Automatic account balance updates on transactions
- Default categories pre-populated on initialization
- Category spending calculations for budgets

## Design Guidelines
The app strictly follows `design_guidelines.md` with:
- **Colors**: Blue/gold primary palette with semantic colors
- **Typography**: Inter for UI, Poppins for display
- **Layout**: Responsive grid system with consistent spacing
- **Components**: Shadcn UI with custom hover/active elevations
- **Interactions**: Smooth transitions and micro-animations

## User Preferences
- Theme preference: Stored in localStorage
- Default currency: INR
- Privacy mode: Optional balance blurring

## Development Notes

### Running the Application
```bash
npm run dev
```
Serves on port 5000 with Vite HMR

### Testing Status
✅ Dashboard loads with stats
✅ Account creation and management
✅ AI expense parsing (with fallback)
✅ Transaction creation with balance updates
✅ Budget creation and tracking
✅ Goal creation and progress
✅ Multi-currency support
✅ Responsive design (desktop + mobile)

### Known Behaviors
- AI integration requires Replit AI Integrations setup (falls back to regex parsing)
- Exchange rates cached for 1 hour
- First account auto-created when adding first transaction
- Balance updates happen immediately on transaction creation

## Next Phase Features (Future)
- Family/shared budgeting with member invitations
- Voice entry for hands-free expense logging
- Investment tracker (mutual funds, SIPs, stocks, crypto)
- Tax planning with deduction tagging
- Gamification (badges, streaks, challenges)
- Recurring expense auto-detection
- Subscription tracking and reminders
- CSV import/export functionality

## Deployment
The application is ready for deployment via Replit's publishing feature. All core functionality is working and tested.
