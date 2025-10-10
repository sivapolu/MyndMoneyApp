import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Calendar as CalendarIcon } from "lucide-react";
import type { Budget, Category } from "@shared/schema";

interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

const COLORS = {
  income: 'hsl(var(--chart-3))',
  expenses: 'hsl(var(--chart-1))',
  budget: 'hsl(var(--chart-2))',
  actual: 'hsl(var(--chart-5))',
};

export default function Analytics() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Generate month options
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Generate year options (current year and 2 years back)
  const years = Array.from({ length: 3 }, (_, i) => currentDate.getFullYear() - i);

  // Calculate date range for selected period (use UTC to avoid timezone shifts)
  const startDate = new Date(Date.UTC(selectedYear, selectedMonth, 1));
  const endDate = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999));

  const { data: budgets } = useQuery<Budget[]>({
    queryKey: ['/api/budgets'],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: spending } = useQuery<Record<string, number>>({
    queryKey: ['/api/budgets/spending', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await fetch(`/api/budgets/spending?${params}`);
      if (!response.ok) throw new Error('Failed to fetch spending');
      return response.json();
    },
  });

  const { data: trends, isLoading } = useQuery<MonthlyTrend[]>({
    queryKey: ['/api/analytics/trends', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await fetch(`/api/analytics/trends?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trends');
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

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-IN', {
      month: 'short',
      year: '2-digit',
    });
  };

  // Prepare Budget vs Actual data
  const budgetVsActualData = budgets && categories && spending 
    ? budgets
        .map(budget => {
          const category = categories.find(c => c.id === budget.categoryId);
          const spent = spending[budget.categoryId] || 0;
          const budgetAmount = Number(budget.amount);
          const periodLabel = budget.period ? ` (${budget.period})` : '';
          return {
            category: `${category?.name || 'Unknown'}${periodLabel}`,
            budget: budgetAmount,
            actual: spent,
            difference: spent - budgetAmount,
            percentage: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
            period: budget.period,
          };
        })
        .sort((a, b) => b.budget - a.budget) // Sort by budget amount
    : [];

  // Prepare Income vs Expenses trend data
  const incomeVsExpensesData = trends?.map(t => ({
    month: formatMonth(t.month),
    income: t.income,
    expenses: t.expenses,
    savings: t.savings,
  })) || [];

  // Calculate summary stats
  const totalBudget = budgetVsActualData.reduce((sum, item) => sum + item.budget, 0);
  const totalActual = budgetVsActualData.reduce((sum, item) => sum + item.actual, 0);
  const avgIncome = incomeVsExpensesData.length > 0 
    ? incomeVsExpensesData.reduce((sum, item) => sum + item.income, 0) / incomeVsExpensesData.length 
    : 0;
  const avgExpenses = incomeVsExpensesData.length > 0 
    ? incomeVsExpensesData.reduce((sum, item) => sum + item.expenses, 0) / incomeVsExpensesData.length 
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse space-y-4 w-full max-w-7xl p-6">
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-muted rounded-xl"></div>
            <div className="h-96 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-semibold">Financial Analytics</h1>
        <p className="text-muted-foreground mt-1">Budget performance and income trends</p>
      </div>

      {/* Period Selector */}
      <Card data-testid="card-period-selector">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Period:</span>
            </div>
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-[150px]" data-testid="select-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-[120px]" data-testid="select-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-budget">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-budget">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground mt-1">All budgets combined</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-spent">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-spent">{formatCurrency(totalActual)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {months[selectedMonth]} {selectedYear} spending
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-income">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-income">{formatCurrency(avgIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per month (12 months)</p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-expenses">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-expenses">{formatCurrency(avgExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per month (12 months)</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Actual Chart */}
        <Card data-testid="card-budget-vs-actual">
          <CardHeader>
            <CardTitle>Budget vs Actual</CardTitle>
            <CardDescription>{months[selectedMonth]} {selectedYear} spending vs budgets</CardDescription>
          </CardHeader>
          <CardContent>
            {budgetVsActualData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetVsActualData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="category" 
                    className="text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="budget" fill={COLORS.budget} name="Budget" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill={COLORS.actual} name="Actual" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <PiggyBank className="h-12 w-12 mx-auto opacity-50" />
                  <p>No budgets created yet</p>
                  <p className="text-sm">Create budgets to see comparison charts</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income vs Expenses Trend */}
        <Card data-testid="card-income-vs-expenses">
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>12-month trend ending {months[selectedMonth]} {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            {incomeVsExpensesData.length > 0 && incomeVsExpensesData.some(d => d.income > 0 || d.expenses > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={incomeVsExpensesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke={COLORS.income} 
                    strokeWidth={2}
                    name="Income"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke={COLORS.expenses} 
                    strokeWidth={2}
                    name="Expenses"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <TrendingUp className="h-12 w-12 mx-auto opacity-50" />
                  <p>No transaction data yet</p>
                  <p className="text-sm">Add transactions to see trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Performance Details */}
      {budgetVsActualData.length > 0 && (
        <Card data-testid="card-budget-details">
          <CardHeader>
            <CardTitle>Budget Performance Details</CardTitle>
            <CardDescription>Category-wise spending analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgetVsActualData.map((item, index) => (
                <div key={index} className="flex items-center justify-between" data-testid={`budget-detail-${index}`}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.category}</span>
                      <span className={`text-sm ${item.percentage > 100 ? 'text-destructive' : item.percentage > 80 ? 'text-chart-5' : 'text-chart-3'}`}>
                        {item.percentage}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Budget: {formatCurrency(item.budget)}</span>
                      <span>Spent: {formatCurrency(item.actual)}</span>
                      <span className={item.difference > 0 ? 'text-destructive' : 'text-chart-3'}>
                        {item.difference > 0 ? 'Over' : 'Under'}: {formatCurrency(Math.abs(item.difference))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
