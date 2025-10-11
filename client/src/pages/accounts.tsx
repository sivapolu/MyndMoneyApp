import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, CreditCard, Smartphone, Bitcoin, Plus, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { Account } from "@shared/schema";
import { PageHeader } from "@/components/page-header";

const accountFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  balance: z.string().min(1, "Balance is required"),
  currency: z.string(),
});

const accountIcons = {
  cash: Wallet,
  card: CreditCard,
  wallet: Smartphone,
  crypto: Bitcoin,
};

export default function Accounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const form = useForm({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: '',
      type: 'card',
      balance: '',
      currency: 'INR',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/accounts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setDialogOpen(false);
      form.reset();
    },
  });

  const handleSubmit = (data: z.infer<typeof accountFormSchema>) => {
    // Map account types to icon names
    const iconMap: Record<string, string> = {
      cash: 'Wallet',
      card: 'CreditCard',
      wallet: 'Smartphone',
      crypto: 'Bitcoin',
    };
    
    createMutation.mutate({
      ...data,
      balance: parseFloat(data.balance),
      icon: iconMap[data.type] || 'Wallet',
    });
  };

  const formatCurrency = (amount: number | string, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const getTotalBalance = () => {
    if (!accounts) return 0;
    return accounts.reduce((sum, account) => sum + Number(account.balance), 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 pb-20 lg:pb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-xl animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader />
      <div className="space-y-6 p-6 pb-24 lg:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-semibold">Accounts</h1>
            <p className="text-muted-foreground mt-1">Manage your financial accounts</p>
          </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-account">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Account</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Wallet" {...field} data-testid="input-account-name" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-account-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Bank Card</SelectItem>
                          <SelectItem value="wallet">Digital Wallet</SelectItem>
                          <SelectItem value="crypto">Cryptocurrency</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Balance</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="10000"
                          {...field}
                          data-testid="input-account-balance"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-account"
                >
                  {createMutation.isPending ? 'Creating...' : 'Add Account'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-chart-1 to-chart-4 text-primary-foreground border-0">
        <CardHeader>
          <CardTitle className="text-sm font-medium opacity-90">Total Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <h2 className="text-4xl font-bold tabular-nums" data-testid="text-total-balance">
              {formatCurrency(getTotalBalance())}
            </h2>
            <TrendingUp className="h-8 w-8 opacity-80" />
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      {accounts && accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => {
            const Icon = accountIcons[account.type as keyof typeof accountIcons] || Wallet;
            return (
              <Card key={account.id} className="hover-elevate transition-all" data-testid={`account-${account.id}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">{account.name}</CardTitle>
                      <p className="text-xs text-muted-foreground capitalize">{account.type}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums" data-testid={`balance-${account.id}`}>
                    {formatCurrency(account.balance, account.currency)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg">No accounts yet</h3>
              <p className="text-muted-foreground mt-1">Add your first account to start tracking</p>
            </div>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-account">
              Add Account
            </Button>
          </div>
        </Card>
      )}
      </div>
    </>
  );
}
