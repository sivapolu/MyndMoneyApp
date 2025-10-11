import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Bell, Shield, Palette, User, LogOut, Sparkles, Key } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";

const AI_MODELS = [
  { value: "gpt-5", label: "GPT-5 (Latest, Most Capable)" },
  { value: "gpt-5-mini", label: "GPT-5 Mini (Fast & Efficient)" },
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini (Recommended)" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
];

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");

  const updateAiModelMutation = useMutation({
    mutationFn: async (aiModel: string) => {
      return await apiRequest('PATCH', '/api/auth/user', { aiModel });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Success",
        description: "AI model preference updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update AI model preference",
        variant: "destructive",
      });
    },
  });

  const updateApiKeyMutation = useMutation({
    mutationFn: async (openaiApiKey: string) => {
      return await apiRequest('PATCH', '/api/auth/user', { openaiApiKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setApiKey("");
      toast({
        title: "Success",
        description: "OpenAI API key updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update OpenAI API key",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const handleModelChange = (value: string) => {
    updateAiModelMutation.mutate(value);
  };

  const handleApiKeySubmit = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }
    updateApiKeyMutation.mutate(apiKey);
  };

  return (
    <>
      <PageHeader />
      <div className="space-y-6 p-6 pb-24 lg:pb-6">
        <div>
        <h1 className="text-3xl font-display font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your preferences</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground">{user?.email || 'Not provided'}</p>
          </div>
          {(user?.firstName || user?.lastName) && (
            <div className="space-y-2">
              <Label>Name</Label>
              <p className="text-sm text-muted-foreground">
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ')}
              </p>
            </div>
          )}
          <div className="pt-2">
            <Button 
              variant="outline" 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <div className="w-10 h-10 rounded-lg bg-chart-5/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-chart-5" />
          </div>
          <div>
            <CardTitle>AI Settings</CardTitle>
            <CardDescription>Configure your AI-powered expense parsing</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>OpenAI API Key</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={user?.openaiApiKey ? "••••••••••••••••" : "Enter your OpenAI API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid="input-openai-key"
              />
              <Button 
                onClick={handleApiKeySubmit}
                disabled={updateApiKeyMutation.isPending}
                data-testid="button-save-openai-key"
              >
                <Key className="h-4 w-4 mr-2" />
                {updateApiKeyMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your personal OpenAI API key for AI-powered expense parsing. Get one at{" "}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                platform.openai.com
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label>AI Model</Label>
            <Select 
              value={user?.aiModel || "gpt-4.1-mini"} 
              onValueChange={handleModelChange}
              disabled={updateAiModelMutation.isPending}
            >
              <SelectTrigger data-testid="select-ai-model">
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Different models offer varying levels of speed and accuracy. GPT-4.1 Mini is recommended for cost-efficiency.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how MyndMoney looks</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-chart-4" />
          </div>
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between" data-testid="setting-budget-alerts">
            <div>
              <Label>Budget Alerts</Label>
              <p className="text-sm text-muted-foreground">Get notified when approaching budget limits</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between" data-testid="setting-subscription-reminders">
            <div>
              <Label>Subscription Reminders</Label>
              <p className="text-sm text-muted-foreground">Reminders before subscription renewals</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-chart-2" />
          </div>
          <div>
            <CardTitle>Privacy & Security</CardTitle>
            <CardDescription>Control your data and privacy</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between" data-testid="setting-blur-amounts">
            <div>
              <Label>Blur Amounts</Label>
              <p className="text-sm text-muted-foreground">Hide balances by default</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
