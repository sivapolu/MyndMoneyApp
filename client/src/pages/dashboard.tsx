import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, TrendingUp, TrendingDown, Wallet, PiggyBank, AlertCircle, ArrowRightLeft } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from "recharts";
import type { DashboardStats, Transaction, Budget, Category } from "@shared/schema";
import { Link } from "wouter";
import { PageHeader } from "@/components/page-header";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Dashboard() {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [fromCurrency, setFromCurrency] = useState("INR");
  const [toCurrency, setToCurrency] = useState("USD");
  const [amount, setAmount] = useState("1000");
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: budgets } = useQuery<Budget[]>({
    queryKey: ['/api/budgets'],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: spending } = useQuery<Record<string, number>>({
    queryKey: ['/api/budgets/spending'],
  });

  const { data: exchangeRates } = useQuery<{ base: string; rates: Record<string, number> }>({
    queryKey: ['/api/exchange-rates', fromCurrency],
    queryFn: async () => {
      const response = await fetch(`/api/exchange-rates/${fromCurrency}`);
      if (!response.ok) throw new Error('Failed to fetch exchange rates');
      return response.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleConvert = async () => {
    if (exchangeRates && amount) {
      const rate = exchangeRates.rates[toCurrency];
      if (rate) {
        const converted = Number(amount) * rate;
        setConvertedAmount(converted);
      }
    }
  };

  // Prepare budget vs expenses data
  const budgetVsExpensesData = budgets && categories && spending 
    ? budgets.map(budget => {
        const category = categories.find(c => c.id === budget.categoryId);
        const spent = spending[budget.categoryId] || 0;
        const budgetAmount = Number(budget.amount);
        return {
          category: category?.name || 'Unknown',
          budget: budgetAmount,
          spent: spent,
          percentage: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
        };
      })
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse space-y-4 w-full max-w-7xl p-6">
          <div className="h-48 bg-muted rounded-2xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-muted rounded-xl"></div>
            <div className="h-32 bg-muted rounded-xl"></div>
            <div className="h-32 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalBalance = stats?.totalBalance || 0;
  const monthlyIncome = stats?.monthlyIncome || 0;
  const monthlyExpenses = stats?.monthlyExpenses || 0;
  const monthlySavings = stats?.monthlySavings || 0;

  return (
    <>
      <PageHeader />
      <div className="space-y-6 p-6 pb-24 lg:pb-6">
        {/* Hero Balance Card */}
      <Card className="relative overflow-hidden border-0">
        <div className="absolute inset-0 bg-gradient-to-br from-chart-1 via-chart-4 to-chart-2 opacity-90"></div>
        <CardHeader className="relative z-10 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-primary-foreground/80">Total Balance</p>
              <h2 className="text-4xl font-bold text-primary-foreground mt-2 font-['Inter'] tabular-nums">
                {balanceVisible ? formatCurrency(totalBalance) : '₹••••••'}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setBalanceVisible(!balanceVisible)}
              className="text-primary-foreground hover:bg-white/20"
              data-testid="button-toggle-balance"
            >
              {balanceVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 pt-0">
          <div className="flex items-center gap-2 text-primary-foreground/90">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">
              {monthlySavings >= 0 ? '+' : ''}{formatCurrency(monthlySavings)} this month
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-3 tabular-nums" data-testid="text-monthly-income">
              {formatCurrency(monthlyIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive tabular-nums" data-testid="text-monthly-expenses">
              {formatCurrency(monthlyExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Savings</CardTitle>
            <PiggyBank className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tabular-nums ${monthlySavings >= 0 ? 'text-chart-2' : 'text-destructive'}`} data-testid="text-monthly-savings">
              {formatCurrency(monthlySavings)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {stats?.topCategories && stats.topCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.topCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percentage }) => `${category} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {stats.topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No spending data yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { month: 'Jan', income: 45000, expenses: 32000 },
                  { month: 'Feb', income: 48000, expenses: 35000 },
                  { month: 'Mar', income: 52000, expenses: 38000 },
                  { month: 'Apr', income: monthlyIncome, expenses: monthlyExpenses },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="hsl(var(--chart-3))" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Budget vs Expenses Chart */}
        {budgetVsExpensesData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Budget vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetVsExpensesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="budget" fill="hsl(var(--chart-1))" name="Budget" />
                    <Bar dataKey="spent" fill="hsl(var(--chart-2))" name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Currency Exchange */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Currency Exchange
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">From</label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger data-testid="select-from-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">To</label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger data-testid="select-to-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Amount</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                data-testid="input-exchange-amount"
              />
            </div>
            <Button 
              onClick={handleConvert} 
              className="w-full"
              data-testid="button-convert-currency"
            >
              Convert
            </Button>
            {convertedAmount !== null && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Result</p>
                <p className="text-2xl font-bold tabular-nums" data-testid="text-converted-amount">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: toCurrency,
                    maximumFractionDigits: 2,
                  }).format(convertedAmount)}
                </p>
                {exchangeRates && (
                  <p className="text-xs text-muted-foreground mt-1">
                    1 {fromCurrency} = {exchangeRates.rates[toCurrency]?.toFixed(4)} {toCurrency}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="font-display">Recent Transactions</CardTitle>
          <Link href="/transactions">
            <Button variant="ghost" size="sm" data-testid="link-view-all-transactions">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
              stats.recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg hover-elevate transition-all"
                  data-testid={`transaction-${transaction.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      transaction.type === 'income' ? 'bg-chart-3/10' : 'bg-destructive/10'
                    }`}>
                      <Wallet className={`h-5 w-5 ${
                        transaction.type === 'income' ? 'text-chart-3' : 'text-destructive'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold tabular-nums ${
                      transaction.type === 'income' ? 'text-chart-3' : 'text-destructive'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No transactions yet</p>
                <Link href="/chat">
                  <Button variant="outline" className="mt-2" data-testid="link-add-first-transaction">
                    Add your first transaction
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budget Alerts */}
      {stats?.topCategories && stats.topCategories.some(c => c.percentage > 80) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="font-display text-destructive">Budget Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topCategories
                .filter(c => c.percentage > 80)
                .map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{category.category} is at {category.percentage}% of budget</span>
                    <Link href="/budgets">
                      <Button variant="outline" size="sm" data-testid={`link-manage-budget-${index}`}>
                        Manage
                      </Button>
                    </Link>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  );
}
