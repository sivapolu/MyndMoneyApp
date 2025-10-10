import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wallet, TrendingUp, Target, Sparkles, Shield, Zap } from "lucide-react";
import logoPath from "@assets/ChatGPT Image Oct 10, 2025, 12_45_55 AM_1760043891915.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <img 
                src={logoPath} 
                alt="MyndMoney Logo" 
                className="h-32 w-auto object-contain brightness-110 contrast-125 saturate-125"
              />
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Smart Finance Tracker with AI-powered expense parsing, budgeting tools, and multi-currency support
            </p>
            <Button 
              size="lg" 
              className="text-lg px-8" 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Get Started
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            <Card className="p-6 hover-elevate">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">AI-Powered Parsing</h3>
              </div>
              <p className="text-muted-foreground">
                Just type "spent 500 on lunch" and watch AI automatically categorize your expenses
              </p>
            </Card>

            <Card className="p-6 hover-elevate">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Smart Budgeting</h3>
              </div>
              <p className="text-muted-foreground">
                Set category-wise budgets with visual progress tracking and smart alerts
              </p>
            </Card>

            <Card className="p-6 hover-elevate">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Savings Goals</h3>
              </div>
              <p className="text-muted-foreground">
                Track your progress towards financial goals with deadline management
              </p>
            </Card>

            <Card className="p-6 hover-elevate">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Multi-Currency</h3>
              </div>
              <p className="text-muted-foreground">
                Support for INR, USD, EUR with real-time exchange rates from live APIs
              </p>
            </Card>

            <Card className="p-6 hover-elevate">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Secure & Private</h3>
              </div>
              <p className="text-muted-foreground">
                Your financial data is encrypted and isolated per user with secure authentication
              </p>
            </Card>

            <Card className="p-6 hover-elevate">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Lightning Fast</h3>
              </div>
              <p className="text-muted-foreground">
                Instant insights with beautiful charts, trends, and real-time balance updates
              </p>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to take control of your finances?</h2>
            <p className="text-muted-foreground mb-6">
              Sign up now and start tracking your expenses with the power of AI
            </p>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-signup"
            >
              Sign Up / Log In
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-muted-foreground">
            © 2025 MyndMoney. Built with AI-powered financial intelligence.
          </p>
        </div>
      </div>
    </div>
  );
}
