# MyndMoney - Smart Finance Tracker

## Overview
MyndMoney is a comprehensive personal finance tracking application designed to help users manage their finances effectively. It offers AI-powered expense parsing, robust budgeting tools, multi-currency support, and secure user authentication. The project aims to provide a modern, intuitive, and secure platform for personal financial management, distinguishing itself with advanced AI features and a professional user experience. MyndMoney seeks to empower users with insights into their spending habits, facilitate smart financial planning, and support wealth accumulation through goal tracking and predictive analytics.

## Recent Changes
- **Database Schema Fix (Oct 10, 2025)**: Fixed critical production authentication error caused by Supabase's auth.users table conflicting with public.users. Updated all Drizzle schema tables to explicitly use `publicSchema.table()` instead of `pgTable()`, ensuring all queries target public.users regardless of search_path or PgBouncer settings. This resolves "column reset_token does not exist" errors in production.
- **Logo Update (Oct 10, 2025)**: Replaced application logo with "Untitled design_1760082821987.png" featuring a gold head icon with dollar sign and "MyndMoney" text. Logo is displayed on both Login Page (w-48) and App Sidebar (h-20).
- **Budget CSV Import**: Added budget import functionality with column mapping, preview, and bulk import capabilities.
- **Import Page Enhancement**: Added Transactions/Budgets tabs on import page with type-specific column mapping and validation.

## User Preferences
I want iterative development.
Ask before making major changes.
I prefer detailed explanations.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
The application features a modern, professional UI adhering to specific design guidelines (`design_guidelines.md`). This includes a blue/gold primary color palette, Inter and Poppins typography, a responsive grid system, and Shadcn UI components with custom hover/active elevations and smooth transitions. The user interface supports both light and dark themes.

### Technical Implementations
- **Frontend**: Built with React, Wouter for routing, TanStack Query for data fetching, Shadcn UI for components, and Tailwind CSS for styling.
- **Backend**: Implemented using Express.js for the API, PostgreSQL (Supabase) as the database, and Drizzle ORM for database interactions.
- **Authentication**: Custom email/password authentication using Passport.js with a local strategy. Passwords are secured with scrypt hashing, and user sessions are managed via `connect-pg-simple` storing sessions in PostgreSQL. Password reset uses an email-based OTP system via an external API.
- **AI Integration**: Leverages personal OpenAI API keys (encrypted with AES-256-CBC) for natural language expense parsing and financial predictions. Supports multi-expense parsing and OCR receipt scanning. Fallback mechanisms are in place (Replit AI Integrations or regex parsing) if an OpenAI key is not provided. Users can select their preferred AI model (GPT-5, GPT-4.1, GPT-4o variants).
- **Data Management**: All user data is strictly isolated. Transactions automatically update account balances.
- **Data Import**: Comprehensive CSV data import functionality with intelligent column mapping, date format selection, accounting format support, auto-categorization, and error handling.

### Feature Specifications
- **User Authentication**: Secure signup, login, logout, password reset with email OTP, and protected routes.
- **Dashboard**: Provides an overview of financial health including balances, monthly income/expenses/savings, category spending, trends, and recent transactions.
- **AI-Powered Expense Entry**: Chat-style input for transaction logging, multi-expense parsing, and OCR scanning for receipts (merchant, date, total, line items extraction). Includes auto-categorization and transaction preview.
- **Account Management**: Supports various account types (cash, card, wallet, crypto) with multi-currency support and real-time exchange rates.
- **Budget Planning**: Category-wise budget creation with visual progress bars, alerts, and flexible periods (weekly, monthly, yearly).
- **Savings Goals**: Allows creation and tracking of savings goals with target amounts and deadlines.
- **Historical Reports**: Provides month/year selectable financial reports including period stats, category breakdowns, and transaction history.
- **AI Intelligence & Insights**: Offers 2-year income/expense predictions, spending pattern analysis, personalized savings recommendations, and smart insights.
- **Financial Analysis & Analytics**: Features budget vs. actual comparisons and 12-month income vs. expenses trend charts with historical period selection.
- **Settings**: Allows users to manage their OpenAI API key, select AI models, toggle themes, and manage privacy controls.

### System Design Choices
- **Database Schema**: PostgreSQL with Drizzle ORM, featuring user-specific tables linked by `userId` for data isolation. Uses UUID primary keys and proper foreign key relationships.
- **Schema Validation**: Zod is used for robust schema validation and type coercion on all API request bodies.
- **Storage**: Custom `DatabaseStorage` module with user scoping for all CRUD operations.
- **API Endpoints**: Comprehensive set of RESTful API endpoints for managing users, accounts, transactions, budgets, goals, and AI interactions, all protected by authentication middleware.

## External Dependencies
- **OpenAI API**: Used for AI-powered natural language expense parsing, financial predictions, and insights. Users provide their own keys.
- **OCR.space API**: Utilized for Optical Character Recognition (OCR) to extract data from uploaded receipts and bills.
- **Exchange Rate API**: Provides real-time currency exchange rates for multi-currency support and conversions.
- **Email OTP API**: `http://app.c360.zone/tekroi_api/api/email_send` is used for sending email-based One-Time Passwords for password reset functionality.
- **Supabase**: Provides the PostgreSQL database infrastructure.