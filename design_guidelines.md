# MyndMoney Design Guidelines

## Design Approach
**Selected Approach:** Design System with Financial App Best Practices

Drawing inspiration from modern financial applications (Mint, YNAB) combined with productivity tools (Linear, Notion) to create a trustworthy yet conversational interface. The design balances data density with approachability through the chat-style interaction model.

**Key Design Principles:**
- **Trust through clarity:** Financial data demands precision and transparency
- **Conversational ease:** Chat-style input reduces friction and complexity
- **Intelligent hierarchy:** Prioritize actionable insights over raw data
- **Mobile-first optimization:** Essential for on-the-go expense tracking

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary (Brand Blue): 220 85% 25% - Headers, CTAs, active states
- Primary Lighter: 220 75% 45% - Hover states, secondary actions
- Gold Accent: 45 90% 55% - Goals achieved, positive indicators
- Background: 0 0% 98% - Main canvas
- Surface: 0 0% 100% - Cards, elevated elements
- Text Primary: 220 20% 15%
- Text Secondary: 220 15% 45%

**Dark Mode:**
- Primary (Brand Blue): 220 80% 65% - Headers, CTAs, active states
- Primary Darker: 220 70% 45% - Hover states
- Gold Accent: 45 85% 60% - Goals, highlights
- Background: 220 25% 8% - Main canvas
- Surface: 220 20% 12% - Cards, elevated elements
- Text Primary: 0 0% 95%
- Text Secondary: 220 10% 70%

**Semantic Colors (Both Modes):**
- Income/Positive: 142 76% 36% (light) / 142 70% 45% (dark)
- Expense/Negative: 0 84% 60% (light) / 0 72% 65% (dark)
- Warning: 38 92% 50% (light) / 38 85% 60% (dark)
- Info: 199 89% 48% (light) / 199 80% 60% (dark)

### B. Typography

**Font Families:**
- Primary: 'Inter' (Google Fonts) - UI, body text, data
- Accent: 'Poppins' (Google Fonts) - Headers, brand elements

**Type Scale:**
- Display: 2.5rem (40px), Poppins SemiBold - Hero sections
- H1: 2rem (32px), Poppins SemiBold - Page titles
- H2: 1.5rem (24px), Poppins Medium - Section headers
- H3: 1.25rem (20px), Inter SemiBold - Card titles
- Body Large: 1.125rem (18px), Inter Regular - Primary content
- Body: 1rem (16px), Inter Regular - Standard text
- Body Small: 0.875rem (14px), Inter Regular - Secondary info
- Caption: 0.75rem (12px), Inter Medium - Labels, metadata

**Currency Display:**
- Large amounts: 1.875rem (30px), Inter Bold, tabular-nums
- Regular amounts: 1.125rem (18px), Inter SemiBold, tabular-nums
- Small amounts: 0.875rem (14px), Inter Medium, tabular-nums

### C. Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Micro spacing: p-2, gap-2 (8px) - Tight groupings
- Standard spacing: p-4, gap-4 (16px) - Component padding
- Section spacing: p-6, gap-6 (24px) - Card interiors
- Major spacing: p-8, py-12 (32px, 48px) - Section separation
- Hero spacing: py-16, py-20 (64px, 80px) - Large sections

**Responsive Breakpoints:**
- Mobile: Base (< 640px) - Single column, bottom navigation
- Tablet: md (768px) - Two column where appropriate
- Desktop: lg (1024px) - Full sidebar, multi-column dashboard
- Wide: xl (1280px) - Maximum content width: max-w-7xl

**Grid System:**
- Dashboard: 12-column grid with 4-gap spacing
- Mobile: Single column stack
- Tablet: 2-column for cards, 1-column for chat
- Desktop: 3-4 column for statistics, 2-column for transactions

### D. Component Library

**Chat Interface (Primary Interaction):**
- Fixed bottom input bar with rounded-2xl container
- Message bubbles: User (blue bg, right-aligned), System (surface bg, left-aligned)
- Input field: h-12, rounded-full, with send icon button
- Typing indicator: Animated dots in brand blue
- Quick actions: Pill-shaped suggestion chips below input

**Transaction Cards:**
- Rounded-xl cards with subtle shadow (shadow-sm)
- Icon + Category + Amount + Date layout
- Swipe actions: Delete (red), Edit (blue), Split (gold)
- Amount typography: Tabular nums, bold, color-coded (green/red)

**Dashboard Charts:**
- Pie chart: Category breakdown with legend
- Bar chart: Monthly comparison with gradient fills
- Line chart: Trend analysis with smooth curves
- Use recharts library with brand color palette
- Height: h-64 for cards, h-80 for featured charts

**Budget Progress Bars:**
- Height: h-3, rounded-full
- Multi-segment for category splits
- Percentage labels at 50%, 80%, 100% thresholds
- Animated fills on load with transition-all duration-500

**Navigation:**
- Mobile: Bottom tab bar with 5 icons (Home, Chat, Budgets, Accounts, More)
- Desktop: Left sidebar (w-64) with collapsible groups
- Active state: Brand blue with subtle background highlight
- Icons: Heroicons outline (inactive), solid (active)

**Forms & Inputs:**
- Input fields: h-12, rounded-lg, border with focus ring
- Select dropdowns: Custom styled with chevron icon
- Toggle switches: For privacy mode, notifications
- Date pickers: Calendar popup with month navigation
- Currency selector: Flag + code dropdown

**Action Buttons:**
- Primary CTA: bg-primary, text-white, h-12, rounded-lg, font-semibold
- Secondary: variant="outline", border-primary, h-10
- Floating action button: Fixed bottom-right, rounded-full, w-14 h-14
- Icon buttons: w-10 h-10, rounded-lg for compact actions

**Data Tables:**
- Sticky header with sort indicators
- Alternating row colors in light mode, subtle borders in dark
- Actions column: Dropdown menu with edit/delete/split
- Responsive: Collapse to cards on mobile
- Pagination: Show 10/25/50 rows with page controls

**Modals & Overlays:**
- Overlay: bg-black/50 backdrop blur
- Modal: max-w-lg, rounded-2xl, p-6
- Header: Close button (top-right), title (H2)
- Actions: Footer with Cancel + Confirm buttons
- Slide-up on mobile, center on desktop

### E. Specific Page Layouts

**Dashboard (Home):**
- Hero card: Total balance with privacy toggle, h-48, gradient background
- Quick stats grid: 3-column (Income, Expenses, Savings) with icons
- Spending chart: Full-width card with tab navigation (Week/Month/Year)
- Recent transactions: List with "View All" link
- Budget alerts: Notification-style cards for exceeded budgets

**Chat Expense Entry:**
- Full-height chat view with scrollable message history
- Expense confirmation card: Shows parsed amount, category, date with Edit/Confirm
- Voice input: Microphone icon in input bar, waveform animation during recording
- Suggestions: Category pills, recent merchants, frequent amounts

**Budgets:**
- Category cards grid: 2-column mobile, 3-column desktop
- Each card: Icon, name, spent/total, progress bar
- Add budget: Floating action button opens modal
- Filter tabs: All, Food, Transport, Bills, etc.

**Accounts:**
- Account cards: Icon, name, balance, last updated
- Tap to expand: Transaction list within card
- Add account: Modal with account type selector (Cash, Card, Wallet, Crypto)
- Currency switcher: Header dropdown to change base currency

**Images:**
- **Dashboard Hero:** Abstract financial growth illustration (graphs trending upward with gold accents), full-width, h-48
- **Empty States:** Minimalist illustrations for "No transactions," "No budgets set" - friendly, blue/gold line art
- **Onboarding Screens:** Step-by-step illustrations showing chat entry, budget setup, insights - modern, approachable style

---

**Critical Implementation Notes:**
- All currency amounts must use tabular-nums font feature
- Dark mode: Ensure form inputs have visible borders (border-white/10)
- Chat messages: Max-width 80% to prevent edge-to-edge text
- Loading states: Skeleton screens matching component shapes
- Error states: Inline messages in semantic red with icon
- Success feedback: Toast notifications, slide-in from top-right
- Animations: Use sparingly - only for state changes and micro-interactions (transition-all duration-200)