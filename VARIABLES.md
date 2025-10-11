# MyndMoney - Variables Reference

This document lists all important variables, constants, and configurations used in the MyndMoney application.

---

## 1. Environment Variables

### Required Environment Variables
These are automatically provided by Replit and must be available:

```bash
# Database Configuration
DATABASE_URL              # PostgreSQL connection string (auto-provided by Replit)
PGHOST                   # PostgreSQL host
PGPORT                   # PostgreSQL port
PGUSER                   # PostgreSQL username
PGPASSWORD               # PostgreSQL password
PGDATABASE               # PostgreSQL database name

# Security & Sessions
SESSION_SECRET           # Secret key for session encryption (auto-generated)
ENCRYPTION_SECRET        # Optional: Encryption key for API keys (falls back to SESSION_SECRET)

# Environment
NODE_ENV                 # "development" or "production"
```

### Optional AI Integration Variables
```bash
# Replit AI Integrations (fallback)
AI_INTEGRATIONS_OPENAI_BASE_URL    # Replit's OpenAI proxy URL
AI_INTEGRATIONS_OPENAI_API_KEY     # Replit's OpenAI API key
```

---

## 2. Application Constants

### API URLs & Endpoints

#### Currency Exchange API
```typescript
// server/currency.ts
EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest'
CACHE_DURATION = 3600000  // 1 hour in milliseconds
```

#### Email OTP API
```typescript
// server/routes.ts
EMAIL_OTP_API_URL = 'http://app.c360.zone/tekroi_api/api/email_send'
```

### Default Values

#### User Settings
```typescript
// shared/schema.ts - users table
DEFAULT_AI_MODEL = "gpt-4.1-mini"           // Default AI model for new users
DEFAULT_CURRENCY = "INR"                     // Default currency
```

#### Transaction Settings
```typescript
// shared/schema.ts - transactions table
DEFAULT_CURRENCY = "INR"
DEFAULT_IS_RECURRING = false
```

#### Account Settings
```typescript
// shared/schema.ts - accounts table
DEFAULT_BALANCE = "0"
DEFAULT_CURRENCY = "INR"
```

#### Budget Settings
```typescript
// shared/schema.ts - budgets table
DEFAULT_PERIOD = "monthly"
DEFAULT_ALERT_ENABLED = false
DEFAULT_ALERT_THRESHOLD = 80  // percentage
```

#### Goal Settings
```typescript
// shared/schema.ts - goals table
DEFAULT_CURRENCY = "INR"
```

---

## 3. Brand & Design Variables

### Color Scheme
```typescript
// Primary Brand Colors
NAVY_BLUE = "#1C2F4A"           // Primary brand color
MYNDMONEY_GOLD = "#C8A046"      // Secondary brand color

// Applied as:
- Gradient backgrounds (navy to gold)
- Button accents
- Icon colors
- Toggle states
```

### Typography
```
PRIMARY_FONT = "Inter"          // Body text
HEADING_FONT = "Poppins"        // Headers & titles
```

---

## 4. Configuration Constants

### File Upload Limits
```typescript
// server/routes.ts - multer configuration
MAX_FILE_SIZE = 5 * 1024 * 1024  // 5MB max file size
ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf'
]
```

### OCR Configuration
```typescript
// server/ocr.ts
BANK_STATEMENT_TOKEN_LIMIT = 8000      // For bank statements with many transactions
REGULAR_OCR_TOKEN_LIMIT = 4000         // For single receipts
```

### Session Configuration
```typescript
// server/auth.ts
SESSION_NAME = "myndmoney_session"
SESSION_COOKIE = {
  httpOnly: true,
  sameSite: "lax",
  secure: true (in production),
  maxAge: 30 days
}
```

### Password Reset
```typescript
// server/routes.ts
RESET_TOKEN_VALIDITY = 15 * 60 * 1000  // 15 minutes in milliseconds
```

---

## 5. Database Schema Constants

### Supported Transaction Types
```typescript
TRANSACTION_TYPES = ["expense", "income"]
```

### Supported Category Types
```typescript
CATEGORY_TYPES = ["expense", "income"]
```

### Supported Account Types
```typescript
ACCOUNT_TYPES = ["cash", "card", "wallet", "crypto"]
```

### Supported Budget Periods
```typescript
BUDGET_PERIODS = ["weekly", "monthly", "yearly"]
```

### Supported Recurring Frequencies
```typescript
RECURRING_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"]
```

### Supported Currencies
```typescript
SUPPORTED_CURRENCIES = [
  "INR",  // Indian Rupee (default)
  "USD",  // US Dollar
  "EUR",  // Euro
  "GBP",  // British Pound
  "JPY",  // Japanese Yen
  "AUD",  // Australian Dollar
  "CAD",  // Canadian Dollar
  // ... and more via exchange rate API
]
```

---

## 6. AI Model Options

### Available AI Models
```typescript
AI_MODELS = [
  "gpt-5",              // Latest GPT-5
  "gpt-4.1",            // GPT-4.1 full
  "gpt-4.1-mini",       // GPT-4.1 mini (default)
  "gpt-4o",             // GPT-4o
  "gpt-4o-mini"         // GPT-4o mini
]
```

### AI Temperature Settings
```typescript
// server/ai-insights.ts
PREDICTION_TEMPERATURE = 0.3      // Low for consistent predictions
PATTERN_TEMPERATURE = 0.5         // Medium for pattern analysis
RECOMMENDATION_TEMPERATURE = 0.7   // Higher for creative suggestions
```

---

## 7. Security Constants

### Encryption
```typescript
// server/auth.ts
ENCRYPTION_ALGORITHM = "aes-256-cbc"
MIN_SECRET_LENGTH = 16  // Minimum characters for encryption secret
SALT_ROUNDS = 10        // bcrypt salt rounds for password hashing
```

### Password Requirements
```typescript
// Enforced in validation schemas
MIN_PASSWORD_LENGTH = 6
```

---

## 8. Frontend Constants

### Route Paths
```typescript
ROUTES = {
  CHAT: "/",                    // Landing page
  DASHBOARD: "/dashboard",
  INSIGHTS: "/insights",
  ANALYTICS: "/analytics",
  SETTINGS: "/settings",
  BUDGETS: "/budgets",
  ACCOUNTS: "/accounts",
  GOALS: "/goals",
  CATEGORIES: "/categories",
  REPORTS: "/reports",
  IMPORT: "/import",
  LOGIN: "/login",
  SIGNUP: "/signup"
}
```

### Sidebar Configuration
```typescript
// client/src/App.tsx
SIDEBAR_WIDTH = "20rem"           // 320px
SIDEBAR_WIDTH_ICON = "4rem"       // Default icon width
SIDEBAR_DEFAULT_OPEN = false      // Collapsed by default
```

### Query Cache Settings
```typescript
// client/src/lib/queryClient.ts
STALE_TIME = 5 * 60 * 1000       // 5 minutes
CACHE_TIME = 10 * 60 * 1000      // 10 minutes
```

---

## 9. Category & Icon Defaults

### Default Icons by Category Type
```typescript
// Used in seed.ts and category creation
EXPENSE_ICONS = [
  "ShoppingBag", "Home", "Car", "Utensils", 
  "ShoppingCart", "Plane", "Laptop", "Heart",
  "Film", "Gift", "BookOpen", "MoreHorizontal"
]

INCOME_ICONS = [
  "Briefcase", "DollarSign", "TrendingUp", 
  "PiggyBank", "Wallet"
]
```

### Default Colors
```typescript
CHART_COLORS = [
  "chart-1", "chart-2", "chart-3", 
  "chart-4", "chart-5"
]
```

---

## 10. Validation Constants

### Date Formats
```typescript
// server/routes.ts - CSV import
SUPPORTED_DATE_FORMATS = [
  "YYYY-MM-DD",
  "DD/MM/YYYY", 
  "MM/DD/YYYY",
  "DD-MM-YYYY",
  "YYYY/MM/DD"
]
```

### Accounting Formats
```typescript
ACCOUNTING_FORMATS = [
  "standard",    // Regular numbers
  "accounting"   // Parentheses for negatives
]
```

---

## 11. Server Configuration

### Port Configuration
```typescript
// server/index.ts
PORT = 5000  // Frontend and backend served on same port
```

### CORS Settings
```typescript
// All routes use same-origin policy
// No external CORS needed (frontend + backend on same domain)
```

---

## Notes

1. **Environment Variables**: Never commit actual values to git. These are managed by Replit's secret management.

2. **User-Configurable Settings**: Some constants (like AI model, currency) can be overridden by user preferences stored in the database.

3. **Brand Colors**: Navy Blue (#1C2F4A) and Gold (#C8A046) are the official brand colors and should not be changed.

4. **API Keys**: User's personal OpenAI API keys are encrypted using AES-256-CBC before storage.

5. **Database IDs**: All use UUID (varchar) with `gen_random_uuid()` for primary keys.
