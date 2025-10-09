import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { Bell, Shield, Palette } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-3xl font-display font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your preferences</p>
      </div>

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
  );
}
