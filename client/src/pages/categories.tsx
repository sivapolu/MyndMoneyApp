import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema, type Category, type InsertCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ShoppingBag, Car, UtensilsCrossed, FileText, Film, Heart, GraduationCap, MoreHorizontal, Wallet, Briefcase, TrendingUp, Gift, Home, Zap, Smartphone, Plane, Coffee, Music, GamepadIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";

const iconOptions = [
  { value: "ShoppingBag", label: "Shopping Bag", icon: ShoppingBag },
  { value: "Car", label: "Car", icon: Car },
  { value: "UtensilsCrossed", label: "Food", icon: UtensilsCrossed },
  { value: "FileText", label: "Bills", icon: FileText },
  { value: "Film", label: "Entertainment", icon: Film },
  { value: "Heart", label: "Healthcare", icon: Heart },
  { value: "GraduationCap", label: "Education", icon: GraduationCap },
  { value: "Home", label: "Home", icon: Home },
  { value: "Zap", label: "Utilities", icon: Zap },
  { value: "Smartphone", label: "Tech", icon: Smartphone },
  { value: "Plane", label: "Travel", icon: Plane },
  { value: "Coffee", label: "Coffee", icon: Coffee },
  { value: "Music", label: "Music", icon: Music },
  { value: "GamepadIcon", label: "Gaming", icon: GamepadIcon },
  { value: "Wallet", label: "Wallet", icon: Wallet },
  { value: "Briefcase", label: "Business", icon: Briefcase },
  { value: "TrendingUp", label: "Investment", icon: TrendingUp },
  { value: "Gift", label: "Gift", icon: Gift },
  { value: "MoreHorizontal", label: "Other", icon: MoreHorizontal },
];

const colorOptions = [
  { value: "hsl(var(--chart-1))", label: "Blue", color: "hsl(var(--chart-1))" },
  { value: "hsl(var(--chart-2))", label: "Green", color: "hsl(var(--chart-2))" },
  { value: "hsl(var(--chart-3))", label: "Orange", color: "hsl(var(--chart-3))" },
  { value: "hsl(var(--chart-4))", label: "Purple", color: "hsl(var(--chart-4))" },
  { value: "hsl(var(--chart-5))", label: "Pink", color: "hsl(var(--chart-5))" },
];

export default function Categories() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const form = useForm<InsertCategory>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      type: "expense",
      icon: "MoreHorizontal",
      color: "hsl(var(--chart-1))",
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: InsertCategory) => {
      return await apiRequest('POST', '/api/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Category created",
        description: "Your custom category has been added successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCategory) => {
    createCategoryMutation.mutate(data);
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName);
    return iconOption?.icon || MoreHorizontal;
  };

  const expenseCategories = categories?.filter(c => c.type === 'expense') || [];
  const incomeCategories = categories?.filter(c => c.type === 'income') || [];

  return (
    <>
      <PageHeader />
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h1 className="text-2xl font-semibold">Categories</h1>
            <p className="text-sm text-muted-foreground">Manage expense and income categories</p>
          </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-category">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-add-category">
            <DialogHeader>
              <DialogTitle>Create Custom Category</DialogTitle>
              <DialogDescription>
                Add a new category for tracking your expenses or income.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Groceries" data-testid="input-category-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category-icon">
                            <SelectValue placeholder="Select icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {iconOptions.map((option) => {
                            const Icon = option.icon;
                            return (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <span>{option.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category-color">
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full border" 
                                  style={{ backgroundColor: option.color }}
                                />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={createCategoryMutation.isPending} data-testid="button-submit-category">
                  {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading categories...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Expense Categories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expenseCategories.map((category) => {
                  const Icon = getIconComponent(category.icon);
                  return (
                    <Card key={category.id} className="hover-elevate" data-testid={`category-${category.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center" 
                            style={{ backgroundColor: category.color, opacity: 0.2 }}
                          >
                            <Icon className="w-5 h-5" style={{ color: category.color }} />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{category.name}</CardTitle>
                            {category.userId && (
                              <Badge variant="secondary" className="mt-1">Custom</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Income Categories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {incomeCategories.map((category) => {
                  const Icon = getIconComponent(category.icon);
                  return (
                    <Card key={category.id} className="hover-elevate" data-testid={`category-${category.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center" 
                            style={{ backgroundColor: category.color, opacity: 0.2 }}
                          >
                            <Icon className="w-5 h-5" style={{ color: category.color }} />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{category.name}</CardTitle>
                            {category.userId && (
                              <Badge variant="secondary" className="mt-1">Custom</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
