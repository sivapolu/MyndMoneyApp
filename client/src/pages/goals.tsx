import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Target, Plus, Trophy, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { Goal } from "@shared/schema";
import { PageHeader } from "@/components/page-header";

const goalFormSchema = z.object({
  name: z.string().min(1, "Goal name is required"),
  targetAmount: z.string().min(1, "Target amount is required"),
  currentAmount: z.string().optional(),
  deadline: z.string().optional(),
});

export default function Goals() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
  });

  const form = useForm({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: '',
      targetAmount: '',
      currentAmount: '0',
      deadline: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/goals', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      setDialogOpen(false);
      form.reset();
    },
  });

  const handleSubmit = (data: z.infer<typeof goalFormSchema>) => {
    createMutation.mutate({
      name: data.name,
      targetAmount: parseFloat(data.targetAmount),
      currentAmount: parseFloat(data.currentAmount || '0'),
      deadline: data.deadline ? new Date(data.deadline) : null,
      icon: 'Target',
      color: 'chart-2',
    });
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const getProgress = (current: number | string, target: number | string) => {
    return Math.min((Number(current) / Number(target)) * 100, 100);
  };

  const getDaysLeft = (deadline: Date | string | null) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 pb-20 lg:pb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-muted rounded-xl animate-pulse"></div>
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
            <h1 className="text-3xl font-display font-semibold">Savings Goals</h1>
            <p className="text-muted-foreground mt-1">Track your financial milestones</p>
          </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-goal">
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Savings Goal</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Vacation Fund" {...field} data-testid="input-goal-name" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="100000"
                          {...field}
                          data-testid="input-target-amount"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Amount (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          data-testid="input-current-amount"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-deadline" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-goal"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Goal'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {goals && goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const progress = getProgress(goal.currentAmount, goal.targetAmount);
            const daysLeft = getDaysLeft(goal.deadline);
            const isCompleted = progress >= 100;
            
            return (
              <Card
                key={goal.id}
                className={`hover-elevate transition-all ${isCompleted ? 'border-chart-2' : ''}`}
                data-testid={`goal-${goal.id}`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isCompleted ? 'bg-chart-2/20' : 'bg-primary/10'
                    }`}>
                      {isCompleted ? (
                        <Trophy className="h-5 w-5 text-chart-2" />
                      ) : (
                        <Target className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <CardTitle className="text-base font-medium">{goal.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{progress.toFixed(0)}% complete</span>
                      {daysLeft !== null && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isCompleted && (
                    <div className="pt-2 text-sm font-medium text-chart-2 flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      <span>Goal Achieved!</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg">No goals yet</h3>
              <p className="text-muted-foreground mt-1">Set your first savings goal to start tracking</p>
            </div>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-goal">
              Create Goal
            </Button>
          </div>
        </Card>
      )}
      </div>
    </>
  );
}
