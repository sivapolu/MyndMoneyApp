import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, Check, X, Calendar, Tag, Wallet as WalletIcon, TrendingDown, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@shared/schema";

export default function Chat() {
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'system',
      content: 'Hi! I\'m your finance assistant. You can tell me about your expenses and income in natural language, like "Spent ₹800 on food" or "Earned ₹50000 from salary".',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('POST', '/api/chat/parse', { text, type: transactionType });
      return await response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I found this transaction:`,
        timestamp: new Date(),
        transactionPreview: data.transaction,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (transaction: any) => {
      return await apiRequest('POST', '/api/transactions', transaction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: '✓ Transaction saved successfully!',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    parseMutation.mutate(input);
    setInput('');
  };

  const handleConfirm = (transaction: any) => {
    confirmMutation.mutate(transaction);
  };

  const handleReject = () => {
    const rejectMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: 'Transaction cancelled. Feel free to try again!',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, rejectMessage]);
  };

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const suggestions = transactionType === 'expense'
    ? [
        'Spent ₹500 on groceries',
        'Paid ₹2000 for electricity bill',
        'Coffee with friends ₹300',
      ]
    : [
        'Earned ₹50000 from salary',
        'Freelance payment ₹15000',
        'Gift received ₹5000',
      ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)]">
      {/* Transaction Type Toggle */}
      <div className="p-4 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Button
              variant={transactionType === 'expense' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTransactionType('expense')}
              className="flex-1"
              data-testid="button-expense-mode"
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Expense
            </Button>
            <Button
              variant={transactionType === 'income' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTransactionType('income')}
              className="flex-1"
              data-testid="button-income-mode"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Income
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 lg:pb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : message.role === 'system'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-card border border-card-border'
              }`}
              data-testid={`message-${message.id}`}
            >
              <p className="text-sm">{message.content}</p>
              
              {message.transactionPreview && (
                <Card className="mt-3 bg-background/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Transaction Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <div className="flex items-center gap-2 text-sm">
                      <WalletIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(message.transactionPreview.amount)}
                      </span>
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-xs ${
                        message.transactionPreview.type === 'income'
                          ? 'bg-chart-3/10 text-chart-3'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {message.transactionPreview.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="h-4 w-4" />
                      <span>{message.transactionPreview.category}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(message.transactionPreview.date)}</span>
                    </div>
                    <p className="text-sm pt-2">{message.transactionPreview.description}</p>
                    
                    <div className="flex gap-2 pt-3">
                      <Button
                        size="sm"
                        onClick={() => handleConfirm(message.transactionPreview)}
                        disabled={confirmMutation.isPending}
                        className="flex-1"
                        data-testid="button-confirm-transaction"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReject}
                        className="flex-1"
                        data-testid="button-reject-transaction"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ))}
        
        {parseMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-card border border-card-border rounded-2xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:relative p-4 bg-background border-t border-border lg:border-t-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 items-center bg-card border border-card-border rounded-full px-4 py-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={transactionType === 'expense' ? 'Spent ₹800 on food...' : 'Earned ₹50000 from salary...'}
              className="border-0 focus-visible:ring-0 bg-transparent"
              disabled={parseMutation.isPending}
              data-testid="input-chat"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || parseMutation.isPending}
              className="rounded-full shrink-0"
              data-testid="button-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Quick Suggestions */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInput(suggestion)}
                className="rounded-full text-xs"
                data-testid={`button-suggestion-${index}`}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
