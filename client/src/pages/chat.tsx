import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, Check, X, Calendar, Tag, Wallet as WalletIcon, TrendingDown, TrendingUp, Camera, Upload } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('POST', '/api/chat/parse-multi', { text, type: transactionType });
      return await response.json();
    },
    onSuccess: (data) => {
      const count = data.transactions?.length || 0;
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: count === 1 ? 'I found this transaction:' : `I found ${count} transactions:`,
        timestamp: new Date(),
        transactionPreview: data.transactions?.[0], // Keep single for backwards compat
        transactionPreviews: data.transactions, // Array for multi-transaction support
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error: any) => {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: error.message || 'Failed to parse transaction. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (transactions: any[]) => {
      // Use batch endpoint if multiple transactions, single endpoint if one
      if (transactions.length > 1) {
        return await apiRequest('POST', '/api/transactions/batch', { transactions });
      } else {
        return await apiRequest('POST', '/api/transactions', transactions[0]);
      }
    },
    onSuccess: (response, transactions) => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets/spending'] });
      const count = transactions.length;
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: count === 1 ? '✓ Transaction saved successfully!' : `✓ ${count} transactions saved successfully!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
    },
    onError: (error: any) => {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: error.message || 'Failed to save transaction(s). Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const ocrScanMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('receipt', file);
      
      const response = await fetch('/api/ocr/scan', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'OCR scan failed');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Receipt scanned successfully! I found:${data.ocrResult?.merchant ? `\n📍 Merchant: ${data.ocrResult.merchant}` : ''}${data.ocrResult?.total ? `\n💰 Total: ₹${data.ocrResult.total}` : ''}`,
        timestamp: new Date(),
        transactionPreview: data.transaction,
        transactionPreviews: [data.transaction],
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error: any) => {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: error.message || 'Failed to scan receipt. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  const handleConfirm = (transactions: any[]) => {
    confirmMutation.mutate(transactions);
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Accept images (JPG, PNG, WebP, etc.) and PDFs
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: 'Please upload an image file (JPG, PNG, etc.) or PDF document',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    const fileIcon = isPDF ? '📄' : '📸';
    const uploadMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `${fileIcon} Uploaded ${isPDF ? 'PDF' : 'receipt'}: ${file.name}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, uploadMessage]);
    
    ocrScanMutation.mutate(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        'Cab 500, Food 300, Shopping 600',
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
              
              {message.transactionPreviews && message.transactionPreviews.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.transactionPreviews.map((transaction: any, index: number) => (
                    <Card key={index} className="bg-background/50">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <WalletIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold tabular-nums">
                            {formatCurrency(transaction.amount)}
                          </span>
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs ${
                            transaction.type === 'income'
                              ? 'bg-chart-3/10 text-chart-3'
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {transaction.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Tag className="h-4 w-4" />
                          <span>{transaction.category}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(transaction.date)}</span>
                        </div>
                        <p className="text-sm">{transaction.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(message.transactionPreviews!)}
                      disabled={confirmMutation.isPending}
                      className="flex-1"
                      data-testid="button-confirm-transaction"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {message.transactionPreviews.length > 1 ? `Confirm All (${message.transactionPreviews.length})` : 'Confirm'}
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
                </div>
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="input-file-upload"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrScanMutation.isPending}
              className="rounded-full shrink-0"
              data-testid="button-upload-receipt"
              title="Scan receipt (image or PDF)"
            >
              {ocrScanMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </Button>
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
