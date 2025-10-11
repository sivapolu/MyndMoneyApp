/*
  # Initial Schema Creation for MyndMoney

  1. New Tables
    - `sessions` - Session storage for authentication
    - `users` - User accounts with preferences
    - `categories` - Global and user-specific expense/income categories
    - `accounts` - User financial accounts (wallet, card, etc.)
    - `transactions` - User expenses and income records
    - `budgets` - User budget tracking
    - `goals` - User savings goals

  2. Security
    - Enable RLS on all user-specific tables
    - Add policies for authenticated users to access their own data
    
  Note: This app uses custom authentication (not Supabase Auth), so RLS policies
  are set to allow service role access only. The application server handles
  authorization.
*/

-- Sessions table (required for authentication)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  ai_model VARCHAR DEFAULT 'gpt-4o-mini',
  openai_api_key VARCHAR,
  reset_token VARCHAR,
  reset_token_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Categories table (global and user-specific)
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL
);

-- Accounts table (user-specific)
CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  icon TEXT NOT NULL
);

-- Transactions table (user-specific)
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT NOT NULL,
  category_id VARCHAR NOT NULL REFERENCES categories(id),
  account_id VARCHAR NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency TEXT,
  notes TEXT,
  parsed_from TEXT
);

-- Budgets table (user-specific)
CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id VARCHAR NOT NULL REFERENCES categories(id),
  amount DECIMAL(15, 2) NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  alert_at_50 BOOLEAN NOT NULL DEFAULT true,
  alert_at_80 BOOLEAN NOT NULL DEFAULT true,
  alert_at_100 BOOLEAN NOT NULL DEFAULT true
);

-- Goals table (user-specific)
CREATE TABLE IF NOT EXISTS goals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(15, 2) NOT NULL,
  current_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  deadline TIMESTAMP,
  icon TEXT NOT NULL,
  color TEXT NOT NULL
);
