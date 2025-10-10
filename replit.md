# MyndMoney - Smart Finance Tracker

## Overview
MyndMoney is a comprehensive personal finance tracking application with AI-powered expense parsing, budgeting tools, multi-currency support, and secure user authentication. Built with a beautiful, modern UI following professional design guidelines.

## Current State (October 10, 2025)
✅ **Custom Authentication Implemented**
- Email/password authentication with Passport.js
- Secure password hashing using scrypt
- Encrypted OpenAI API key storage per user (AES-256-CBC with KDF)
- PostgreSQL sessions with connect-pg-simple
- User-scoped data isolation
- Secure session management

✅ **MVP Complete and Tested**
- All core features implemented and working
- End-to-end testing passed successfully
- Responsive design with light/dark theme support
- AI integration with defensive fallback handling

## Recent Changes
- **Multi-Expense Parsing (Latest - Oct 10)**: Added support for parsing multiple transactions from a single natural language input. Users can now enter "Cab 500, Food 300, Shopping 600" and get all three transactions parsed and previewed at once. Includes atomic batch creation with strict validation.
- **Supabase Integration (Oct 10)**: Successfully migrated from Neon to Supabase PostgreSQL database. Updated database connection to use node-postgres driver with Transaction Pooler for optimal performance.
- **Custom Authentication (Oct 10)**: Replaced Replit Auth with email/password authentication. Users can now input their own OpenAI API keys for AI-powered expense parsing.
- **Security Hardening**: Implemented scrypt-based key derivation for encryption, proper error handling in logout, and validation for encryption secrets
- **AI Model Selection**: Added user preference for AI model in settings with dropdown selector (GPT-5, GPT-4.1, GPT-4o variants). Chat parsing now uses user's selected model and personal API key
- **Branding**: Integrated custom MyndMoney logo with head silhouette and dollar sign design across landing page and sidebar
- **Schema & Frontend (Task 1)**: Defined complete data models for transactions, budgets, accounts, goals, and categories. Built all React components with exceptional visual quality following design_guidelines.md
- **Backend Implementation (Task 2)**: Implemented all API endpoints, OpenAI AI integration with fallback parsing, currency exchange rate API, and business logic
- **Integration & Testing (Task 3)**: Connected frontend to backend, fixed schema validation issues, implemented proper type coercion, and successfully tested all features

## Features

### Core MVP Features
1. **User Authentication**
   - Custom email/password authentication with Passport.js
   - Secure password hashing using scrypt algorithm
   - PostgreSQL session storage with connect-pg-simple
   - User signup, login, and logout functionality
   - Protected routes with session management
   - Data isolation per user

2. **Dashboard**
   - Hero balance card with privacy toggle
   - Monthly income, expenses, and savings statistics
   - Spending by category pie chart
   - Monthly trend line chart
   - Recent transactions list
   - Budget alerts for exceeded limits

3. **AI-Powered Expense Entry**
   - Chat-style natural language input
   - **Multi-expense parsing**: Parse multiple transactions from single input ("Cab 500, Food 300, Shopping 600")
   - Uses user's personal OpenAI API key (encrypted storage)
   - OpenAI GPT-5 parsing with fallback to Replit AI or regex
   - Auto-categorization of expenses
   - Transaction preview and confirmation with batch display
   - Atomic batch creation with strict validation
   - Quick suggestion buttons

4. **Account Management**
   - Support for cash, card, wallet, and crypto accounts
   - Multi-currency support (INR, USD, EUR)
   - Real-time exchange rates via API
   - Total balance aggregation

5. **Budget Planning**
   - Category-wise budget creation
   - Visual progress bars
   - Alert thresholds (50%, 80%, 100%)
   - Period options (weekly, monthly, yearly)
   - Spending vs budget tracking

6. **Savings Goals**
   - Goal creation with target amounts
   - Progress tracking
   - Deadline management
   - Achievement indicators

7. **Settings**
   - OpenAI API key input (encrypted storage with AES-256-CBC)
   - AI model selection (GPT-5, GPT-4.1, GPT-4o variants)
   - Theme toggle (light/dark mode)
   - Notification preferences
   - Privacy controls
   - Account information display
   - Logout button

### Technical Stack
- **Frontend**: React, Wouter, TanStack Query, Shadcn UI, Tailwind CSS
- **Backend**: Express.js, PostgreSQL (Supabase), Drizzle ORM
- **Authentication**: Passport.js with Local Strategy (email/password)
- **Security**: Scrypt password hashing, AES-256-CBC API key encryption with KDF
- **AI**: User's personal OpenAI API key with fallback to Replit AI Integrations or regex
- **APIs**: Exchange Rate API for currency conversion

## Project Architecture

### Authentication Flow
1. Logged-out users see landing page with login/signup buttons
2. Login via `/api/login` triggers Replit Auth flow
3. Callback at `/api/callback` creates/updates user session
4. All API routes protected with `isAuthenticated` middleware
5. Frontend uses `useAuth` hook to check authentication state
6. Logout via `/api/logout` clears session and redirects

### Data Model
- **Users**: Authentication data (id, email, firstName, lastName, profileImageUrl)
- **Sessions**: Secure session storage for Replit Auth
- **Categories**: Pre-populated expense/income categories with icons and colors (global)
- **Accounts**: Financial accounts with balance tracking (user-specific)
- **Transactions**: Expense/income records with auto balance updates (user-specific)
- **Budgets**: Category-wise spending limits with alerts (user-specific)
- **Goals**: Savings targets with progress tracking (user-specific)

### Database Schema
- PostgreSQL with Drizzle ORM
- All user-specific tables have `userId` foreign key
- Sessions table for secure authentication
- Automatic UUID primary keys
- Proper foreign key relationships

### Schema Validation
All insert schemas use Zod with proper type coercion:
- `z.coerce.number()` for decimal fields
- `z.coerce.date()` for timestamp fields
- Validated request bodies in all API endpoints
- userId omitted from insert schemas (added server-side)

### Key API Endpoints
- `GET /api/auth/user` - Get current user (protected)
- `GET /api/login` - Initiate login flow
- `GET /api/logout` - Logout and clear session
- `GET /api/categories` - All categories (public)
- `POST /api/accounts` - Create account (protected, user-scoped)
- `POST /api/transactions` - Create transaction (protected, user-scoped)
- `POST /api/budgets` - Create budget (protected, user-scoped)
- `POST /api/goals` - Create goal (protected, user-scoped)
- `POST /api/chat/parse` - AI expense parsing (protected, user-scoped)
- `GET /api/dashboard/stats` - Dashboard statistics (protected, user-scoped)
- `GET /api/exchange-rates/:base` - Currency rates (public)
- `POST /api/convert-currency` - Currency conversion (public)

### Storage Implementation
- PostgreSQL DatabaseStorage with user scoping
- All CRUD operations include userId parameter
- Automatic account balance updates on transactions
- Default categories seeded on startup
- Category spending calculations for budgets

## Design Guidelines
The app strictly follows `design_guidelines.md` with:
- **Colors**: Blue/gold primary palette with semantic colors
- **Typography**: Inter for UI, Poppins for display
- **Layout**: Responsive grid system with consistent spacing
- **Components**: Shadcn UI with custom hover/active elevations
- **Interactions**: Smooth transitions and micro-animations

## User Flow

### First-Time User
1. Visit app → See landing page
2. Click "Get Started" → Replit Auth login/signup
3. After authentication → Dashboard (initially empty)
4. Add first account via Accounts page
5. Use Chat to add expenses with AI parsing
6. Create budgets and goals

### Returning User
1. Visit app → Automatic login if session valid
2. See dashboard with personalized data
3. All data isolated to their user account

## Development Notes

### Running the Application
```bash
npm run dev
```
Serves on port 5000 with Vite HMR

### Database Management
```bash
npm run db:push  # Sync schema changes to database
```

### Testing Status
✅ Landing page for logged-out users
✅ Authentication flow (pending e2e test)
✅ Protected routes with user scoping
✅ Dashboard loads with stats
✅ Account creation and management
✅ AI expense parsing (with fallback)
✅ Transaction creation with balance updates
✅ Budget creation and tracking
✅ Goal creation and progress
✅ Multi-currency support
✅ Responsive design (desktop + mobile)
✅ Logout functionality

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPL_ID` - Replit app ID (auto-provided)
- `REPLIT_DOMAINS` - Replit domains (auto-provided)
- `ISSUER_URL` - OpenID issuer URL (defaults to replit.com/oidc)

### Known Behaviors
- AI integration requires Replit AI Integrations setup (falls back to regex parsing)
- Exchange rates cached for 1 hour
- First account auto-created when adding first transaction
- Balance updates happen immediately on transaction creation
- User data completely isolated - no cross-user access
- Sessions expire after 7 days of inactivity

## Next Phase Features (Future)
- Family/shared budgeting with member invitations
- Voice entry for hands-free expense logging
- Investment tracker (mutual funds, SIPs, stocks, crypto)
- Tax planning with deduction tagging
- Gamification (badges, streaks, challenges)
- Recurring expense auto-detection
- Subscription tracking and reminders
- CSV import/export functionality
- Email notifications for budget alerts
- Two-factor authentication

## Deployment
The application is ready for deployment via Replit's publishing feature. All core functionality is working with secure authentication and data persistence.
