import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Lightbulb, Target, AlertTriangle, LineChart, Sparkles } from "lucide-react";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface PredictionData {
  month: string;
  predictedIncome: number;
  predictedExpenses: number;
  confidence: 'high' | 'medium' | 'low';
}

interface SpendingPattern {
  category: string;
  categoryName: string;
  averageMonthly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  insight: string;
}

interface SavingsRecommendation {
  type: 'reduce_spending' | 'increase_income' | 'optimize_budget' | 'emergency_fund';
  title: string;
  description: string;
  potentialSavings: number;
  priority: 'high' | 'medium' | 'low';
}

export default function Insights() {
  const { data: predictions, isLoading: predictionsLoading } = useQuery<PredictionData[]>({
    queryKey: ['/api/insights/predictions'],
  });

  const { data: patterns, isLoading: patternsLoading } = useQuery<SpendingPattern[]>({
    queryKey: ['/api/insights/patterns'],
  });

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery<SavingsRecommendation[]>({
    queryKey: ['/api/insights/recommendations'],
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
      year: 'numeric',
    });
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-chart-3" />;
    return <div className="h-4 w-4" />;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary',
    } as const;
    return <Badge variant={variants[priority as keyof typeof variants] || 'default'}>{priority}</Badge>;
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants = {
      high: 'default',
      medium: 'secondary',
      low: 'outline',
    } as const;
    return <Badge variant={variants[confidence as keyof typeof variants] || 'outline'} className="ml-2">{confidence}</Badge>;
  };

  const isLoading = predictionsLoading || patternsLoading || recommendationsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse space-y-4 w-full max-w-7xl p-6">
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-64 bg-muted rounded-xl"></div>
            <div className="h-64 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data for predictions (next 12 months)
  const chartData = predictions?.slice(0, 12).map(p => ({
    month: formatMonth(p.month),
    income: p.predictedIncome,
    expenses: p.predictedExpenses,
    savings: p.predictedIncome - p.predictedExpenses,
  })) || [];

  const hasData = (predictions && predictions.length > 0) || (patterns && patterns.length > 0) || (recommendations && recommendations.length > 0);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-0">
        <div className="absolute inset-0 bg-gradient-to-br from-chart-1 via-chart-4 to-chart-2 opacity-90"></div>
        <CardHeader className="relative z-10">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
            <div>
              <CardTitle className="text-2xl font-bold text-primary-foreground">AI Insights</CardTitle>
              <CardDescription className="text-primary-foreground/80 mt-1">
                Predictions, patterns, and personalized recommendations powered by AI
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {!hasData && (
        <Card>
          <CardContent className="py-12 text-center">
            <LineChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No insights available yet</h3>
            <p className="text-muted-foreground mb-4">
              Add more transactions to get AI-powered predictions and recommendations
            </p>
            <Button onClick={() => window.location.href = '/chat'}>Add Transactions</Button>
          </CardContent>
        </Card>
      )}

      {/* 2-Year Predictions */}
      {predictions && predictions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-chart-1" />
                  Income & Expense Predictions
                </CardTitle>
                <CardDescription className="mt-1">
                  AI-powered forecasts for the next 12 months
                </CardDescription>
              </div>
              {predictions[0] && getConfidenceBadge(predictions[0].confidence)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Predicted Income" />
                  <Line type="monotone" dataKey="expenses" stroke="hsl(var(--chart-5))" strokeWidth={2} name="Predicted Expenses" />
                  <Line type="monotone" dataKey="savings" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Predicted Savings" />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Avg. Income</p>
                <p className="text-lg font-semibold text-chart-3">
                  {formatCurrency(chartData.reduce((sum, d) => sum + d.income, 0) / chartData.length)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Avg. Expenses</p>
                <p className="text-lg font-semibold text-chart-5">
                  {formatCurrency(chartData.reduce((sum, d) => sum + d.expenses, 0) / chartData.length)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Avg. Savings</p>
                <p className="text-lg font-semibold text-chart-1">
                  {formatCurrency(chartData.reduce((sum, d) => sum + d.savings, 0) / chartData.length)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spending Patterns */}
      {patterns && patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-chart-2" />
              Spending Patterns
            </CardTitle>
            <CardDescription>Smart analysis of your spending habits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patterns.map((pattern, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-muted/50 hover-elevate"
                  data-testid={`pattern-${index}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{pattern.categoryName}</h4>
                      {getTrendIcon(pattern.trend)}
                    </div>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatCurrency(pattern.averageMonthly)}/mo
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{pattern.insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Savings Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-chart-4" />
              Personalized Recommendations
            </CardTitle>
            <CardDescription>AI-powered suggestions to improve your finances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-border hover-elevate"
                  data-testid={`recommendation-${index}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {rec.type === 'reduce_spending' && <AlertTriangle className="h-4 w-4 text-chart-5" />}
                        {rec.type === 'increase_income' && <TrendingUp className="h-4 w-4 text-chart-3" />}
                        {rec.type === 'optimize_budget' && <Target className="h-4 w-4 text-chart-1" />}
                        {rec.type === 'emergency_fund' && <Target className="h-4 w-4 text-chart-2" />}
                        <h4 className="font-medium">{rec.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                    </div>
                    <div className="ml-4">
                      {getPriorityBadge(rec.priority)}
                    </div>
                  </div>
                  {rec.potentialSavings > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-sm text-chart-3 font-medium">
                        Potential savings: {formatCurrency(rec.potentialSavings)}/month
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
