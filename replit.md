# MyndMoney - Smart Finance Tracker

## Overview
MyndMoney is a comprehensive personal finance tracking application that offers AI-powered expense parsing, robust budgeting tools, multi-currency support, and secure user authentication. The project's vision is to empower users with insights into their spending habits, facilitate smart financial planning, and support wealth accumulation through goal tracking and predictive analytics, distinguishing itself with advanced AI features and a professional user experience.

## User Preferences
I want iterative development.
Ask before making major changes.
I prefer detailed explanations.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
The application features a modern, professional UI with a Navy Blue and MyndMoney Gold color scheme (#1C2F4A, #C8A046), Inter and Poppins typography, a responsive grid system, and Shadcn UI components. Design adheres to a "GenZ" aesthetic with modern gradients, backdrop blur effects, and smooth transitions, supporting both light and dark themes. The chat interface is central, acting as the main landing page, with dynamic mode toggles for Expense, Income, and Ask AI queries, and integrated chart visualizations.

### Technical Implementations
- **Frontend**: React, Wouter for routing, TanStack Query for data fetching, Shadcn UI components, and Tailwind CSS for styling.
- **Backend**: Express.js for the API, PostgreSQL (Supabase) as the database, and Drizzle ORM for database interactions.
- **Authentication**: Custom email/password authentication using Passport.js with scrypt hashing and session management via `connect-pg-simple`. Password reset uses an email-based OTP system.
- **AI Integration**: Leverages user-provided OpenAI API keys (GPT-4o-vision) for natural language expense parsing, OCR (image and PDF) receipt/bill scanning, and financial predictions. Fallback mechanisms (Replit AI or regex) are available. AI supports multi-transaction extraction, relative date parsing, and timezone-stable predictions.
- **Data Management**: User data is isolated; transactions automatically update account balances.
- **Data Import**: Comprehensive CSV import for transactions and budgets with intelligent column mapping, auto-categorization, and error handling. Includes a redesigned GenZ-friendly import page with visual progress indicators.

### Feature Specifications
- **User Authentication**: Secure signup, login, logout, password reset, and protected routes.
- **Dashboard**: Financial overview including balances, monthly income/expenses/savings, category spending, trends, and recent transactions.
- **AI-Powered Expense Entry**: Chat-style input, multi-expense parsing, and OCR for receipts/bank statements (image/PDF) with automatic extraction of merchant, date, total, line items, and currency detection. Supports future dates and editable categories.
- **Account Management**: Supports various account types (cash, card, wallet, crypto) with multi-currency support and real-time exchange rates.
- **Budget Planning**: Category-wise budget creation with visual progress and flexible periods. Prevents duplicate budgets for the same category and period.
- **Savings Goals**: Creation and tracking of savings goals.
- **Historical Reports**: Month/year selectable financial reports, category breakdowns, and transaction history.
- **AI Intelligence & Insights**: 2-year income/expense predictions, spending pattern analysis, personalized recommendations, and smart insights.
- **Financial Analysis & Analytics**: Budget vs. actual comparisons and 12-month income vs. expenses trend charts. AI-driven chat analytics with chart visualizations for queries like "travel expenses trend" or "income trend".
- **Settings**: Management of OpenAI API key, AI model selection, theme toggling, and privacy controls.

### System Design Choices
- **Database Schema**: PostgreSQL with Drizzle ORM; `publicSchema.table()` for explicit table targeting, UUID primary keys, and foreign key relationships. User-specific tables for data isolation.
- **Schema Validation**: Zod for robust schema validation and type coercion on all API requests.
- **Storage**: Custom `DatabaseStorage` module with user scoping.
- **API Endpoints**: RESTful API for managing all financial data and AI interactions, protected by authentication middleware.

## External Dependencies
- **OpenAI API**: For AI-powered natural language processing, OCR (Vision API), and financial predictions.
- **Exchange Rate API**: Provides real-time currency exchange rates.
- **Email OTP API**: `http://app.c360.zone/tekroi_api/api/email_send` for password reset OTPs.
- **Supabase**: Hosts the PostgreSQL database.