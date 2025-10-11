import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, Check, X, Calendar, Tag, Wallet as WalletIcon, TrendingDown, TrendingUp, Camera, Menu, BarChart3, Sparkles, Plus, User, Edit2, LineChart as LineChartIcon, PieChart as PieChartIcon } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMessage } from "@shared/schema";
import logoPath from "@assets/Untitled design_1760082821987.png";

export default function Chat() {
  const [, setLocation] = useLocation();
  const { open } = useSidebar();
  const { user } = useAuth();
  const [chatMode, setChatMode] = useState<'transaction' | 'analytics'>('transaction');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  const [editingCategories, setEditingCategories] = useState<{[key: string]: string}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Set welcome message with user's name once user data is loaded
  useEffect(() => {
    if (user && messages.length === 0) {
      const userName = user.firstName || user.email.split('@')[0];
      setMessages([
        {
          id: '1',
          role: 'system',
          content: `Hi ${userName}! I'm your AI finance assistant. Add transactions or ask me questions about your finances.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [user, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyticsMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest('POST', '/api/chat/analytics', { query });
      return await response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.summary || 'Here are your insights:',
        timestamp: new Date(),
        analyticsData: data,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error: any) => {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: error.message || 'Failed to process query. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

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
        transactionPreview: data.transactions?.[0],
        transactionPreviews: data.transactions,
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
    mutationFn: async ({ messageId, transactions }: { messageId: string; transactions: any[] }) => {
      if (transactions.length > 1) {
        return await apiRequest('POST', '/api/transactions/batch', { transactions });
      } else {
        return await apiRequest('POST', '/api/transactions', transactions[0]);
      }
    },
    onSuccess: (response, { messageId, transactions }) => {
      // Mark as processed only after successful save
      setProcessedMessageIds(prev => new Set(prev).add(messageId));
      
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets/spending'] });
      const count = transactions.length;
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: count === 1 ? 'Transaction saved successfully!' : `${count} transactions saved successfully!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
    },
    onError: (error: any, { messageId }) => {
      // DON'T mark as processed on error - allow retry
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
      const getCurrencySymbol = (currency: string) => {
        const symbols: Record<string, string> = {
          'USD': '$',
          'EUR': '€',
          'GBP': '£',
          'INR': '₹',
          'JPY': '¥',
          'AUD': 'A$',
          'CAD': 'C$',
        };
        return symbols[currency] || currency + ' ';
      };
      
      const currencySymbol = getCurrencySymbol(data.ocrResult?.currency || 'INR');
      
      // Handle bank statements with multiple transactions
      if (data.isBankStatement && data.transactions) {
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Bank statement scanned successfully!\n\n${data.ocrResult?.merchant || 'Bank Statement'}\nFound ${data.ocrResult?.transactionCount || data.transactions.length} transactions\nCurrency: ${currencySymbol}\n\nClick "Add All" below to import all transactions.`,
          timestamp: new Date(),
          transactionPreviews: data.transactions,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Handle regular receipt
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Receipt scanned successfully!${data.ocrResult?.merchant ? `\nMerchant: ${data.ocrResult.merchant}` : ''}${data.ocrResult?.total ? `\nTotal: ${currencySymbol}${data.ocrResult.total}` : ''}`,
          timestamp: new Date(),
          transactionPreview: data.transaction,
          transactionPreviews: [data.transaction],
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
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
    
    // Use chatMode to determine whether to parse transaction or run analytics
    if (chatMode === 'analytics') {
      analyticsMutation.mutate(input);
    } else {
      parseMutation.mutate(input);
    }
    
    setInput('');
  };

  const handleConfirm = (messageId: string, transactions: any[]) => {
    // Apply any category changes before confirming
    const updatedTransactions = transactions.map((transaction, index) => {
      const key = `${messageId}-${index}`;
      if (editingCategories[key]) {
        const selectedCategory = (categories as any[]).find((c: any) => c.id === editingCategories[key]);
        return {
          ...transaction,
          categoryId: selectedCategory.id,
          category: selectedCategory.name,
        };
      }
      return transaction;
    });
    
    // Pass messageId to mutation so it can be marked as processed on success
    confirmMutation.mutate({ messageId, transactions: updatedTransactions });
  };

  const handleReject = (messageId: string) => {
    // Mark message as processed to prevent re-clicking
    setProcessedMessageIds(prev => new Set(prev).add(messageId));
    
    const rejectMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: 'Transaction cancelled. Feel free to try again!',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, rejectMessage]);
  };

  const handleCategoryChange = (messageId: string, index: number, categoryId: string) => {
    const key = `${messageId}-${index}`;
    setEditingCategories(prev => ({
      ...prev,
      [key]: categoryId
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

    const uploadMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `Uploaded ${isPDF ? 'PDF' : 'receipt'}: ${file.name}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, uploadMessage]);
    
    ocrScanMutation.mutate(file);
    
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

  const suggestions = chatMode === 'analytics'
    ? [
        'Show travel expenses trend',
        'What was last month spending?',
        'Category breakdown',
      ]
    : transactionType === 'expense'
    ? [
        '₹500 groceries',
        'Cab 500, Food 300',
        'Coffee ₹300',
      ]
    : [
        '₹50k salary',
        'Freelance ₹15k',
        'Gift ₹5k',
      ];

  return (
    <div className="relative flex flex-col h-screen overflow-hidden">
      {/* Gradient Background - Navy Blue Theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E8EDF4] via-[#F0F3F8] to-[#FFF9F0] dark:from-[#0A1525] dark:via-[#1C2F4A] dark:to-[#1A1410]" />
      
      {/* Watermark Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img 
          src={logoPath} 
          alt="MyndMoney" 
          className="w-64 h-64 object-contain opacity-[0.08] dark:opacity-[0.05]"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 bg-white/40 dark:bg-[#1C2F4A]/40 backdrop-blur-lg border-b border-[#C8A046]/20">
        <div className="flex items-center gap-3">
          <SidebarTrigger data-testid="button-sidebar-toggle" className="lg:flex" />
          <h1 className="text-lg font-semibold bg-gradient-to-r from-[#1C2F4A] to-[#C8A046] dark:from-[#C8A046] dark:to-[#E5C06F] bg-clip-text text-transparent">
            MyndMoney
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onClick={() => setLocation('/settings')}
            data-testid="button-profile"
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Chat Mode Toggle - Navy & Gold Theme */}
      <div className="relative z-10 px-4 pt-4">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex p-1 bg-white/60 dark:bg-[#1C2F4A]/60 backdrop-blur-md rounded-full border border-[#C8A046]/30 shadow-lg">
            <Button
              variant={chatMode === 'transaction' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChatMode('transaction')}
              className={`rounded-full px-6 transition-all duration-300 ${
                chatMode === 'transaction' 
                  ? 'bg-gradient-to-r from-[#1C2F4A] to-[#C8A046] text-white shadow-lg' 
                  : 'text-gray-600 dark:text-gray-300'
              }`}
              data-testid="button-transaction-mode"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
            <Button
              variant={chatMode === 'analytics' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChatMode('analytics')}
              className={`rounded-full px-6 transition-all duration-300 ${
                chatMode === 'analytics' 
                  ? 'bg-gradient-to-r from-[#C8A046] to-[#D4AC58] text-white shadow-lg' 
                  : 'text-gray-600 dark:text-gray-300'
              }`}
              data-testid="button-analytics-mode"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Ask AI
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction Type Toggle - Only show in transaction mode */}
      {chatMode === 'transaction' && (
        <div className="relative z-10 px-4 pb-2">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex p-1 bg-white/60 dark:bg-[#1C2F4A]/60 backdrop-blur-md rounded-full border border-[#C8A046]/30 shadow-lg">
              <Button
                variant={transactionType === 'expense' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTransactionType('expense')}
                className={`rounded-full px-6 transition-all duration-300 ${
                  transactionType === 'expense' 
                    ? 'bg-gradient-to-r from-[#C8A046] to-[#D4AC58] text-white shadow-lg' 
                    : 'text-gray-600 dark:text-gray-300'
                }`}
                data-testid="button-expense-mode"
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Expense
              </Button>
              <Button
                variant={transactionType === 'income' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTransactionType('income')}
                className={`rounded-full px-6 transition-all duration-300 ${
                  transactionType === 'income' 
                    ? 'bg-gradient-to-r from-[#1C2F4A] to-[#2A4A6F] text-white shadow-lg' 
                    : 'text-gray-600 dark:text-gray-300'
                }`}
                data-testid="button-income-mode"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Income
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-32 lg:pb-24 space-y-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-3xl px-5 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-[#1C2F4A] to-[#C8A046] text-white shadow-xl'
                    : message.role === 'system'
                    ? 'bg-white/70 dark:bg-[#1C2F4A]/70 backdrop-blur-md text-gray-600 dark:text-gray-300 border border-[#C8A046]/20 shadow-lg'
                    : 'bg-white/80 dark:bg-[#1C2F4A]/80 backdrop-blur-md border border-[#C8A046]/20 shadow-xl'
                }`}
                data-testid={`message-${message.id}`}
              >
                <p className="text-sm whitespace-pre-line">{message.content}</p>
                
                {/* Analytics Chart Visualization */}
                {message.analyticsData && message.analyticsData.type === 'chart' && (
                  <div className="mt-4 p-4 bg-white/50 dark:bg-slate-900/50 rounded-xl">
                    <ResponsiveContainer width="100%" height={250}>
                      {message.analyticsData.chartType === 'area' && (
                        <AreaChart data={message.analyticsData.data}>
                          <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#C8A046" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#C8A046" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" opacity={0.3} />
                          <XAxis dataKey="date" tick={{ fill: 'currentColor', fontSize: 12 }} />
                          <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: '1px solid #C8A046',
                              borderRadius: '8px' 
                            }} 
                          />
                          <Area type="monotone" dataKey="amount" stroke="#C8A046" fillOpacity={1} fill="url(#colorAmount)" />
                        </AreaChart>
                      )}
                      {message.analyticsData.chartType === 'pie' && (
                        <PieChart>
                          <Pie
                            data={message.analyticsData.data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {message.analyticsData.data.map((_: any, index: number) => {
                              const colors = ['#C8A046', '#1C2F4A', '#E5C06F', '#2A3F5F', '#D4AC58', '#3A4F6F'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      )}
                      {message.analyticsData.chartType === 'bar' && (
                        <BarChart data={message.analyticsData.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" opacity={0.3} />
                          <XAxis dataKey="date" tick={{ fill: 'currentColor', fontSize: 12 }} />
                          <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: '1px solid #C8A046',
                              borderRadius: '8px' 
                            }} 
                          />
                          <Bar dataKey="amount" fill="#C8A046" />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}
                
                {message.transactionPreviews && message.transactionPreviews.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.transactionPreviews.map((transaction: any, index: number) => {
                      const key = `${message.id}-${index}`;
                      const selectedCategoryId = editingCategories[key] || transaction.categoryId;
                      const currentCategory = (categories as any[]).find((c: any) => c.id === selectedCategoryId);
                      const transactionCategories = (categories as any[]).filter((c: any) => c.type === transaction.type);
                      
                      return (
                        <Card key={index} className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-white/30 dark:border-slate-700/30 shadow-md">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <WalletIcon className="h-4 w-4 text-[#C8A046]" />
                              <span className="font-bold tabular-nums bg-gradient-to-r from-[#1C2F4A] to-[#C8A046] dark:from-[#C8A046] dark:to-[#E5C06F] bg-clip-text text-transparent">
                                {formatCurrency(transaction.amount)}
                              </span>
                              <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                                transaction.type === 'income'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                              }`}>
                                {transaction.type}
                              </span>
                            </div>
                            
                            {/* Editable Category Selector */}
                            <div className="flex items-center gap-2 text-sm">
                              <Tag className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              {!processedMessageIds.has(message.id) ? (
                                <Select
                                  value={selectedCategoryId}
                                  onValueChange={(value) => handleCategoryChange(message.id, index, value)}
                                >
                                  <SelectTrigger className="h-7 text-sm border-dashed border-[#C8A046]/50 bg-transparent" data-testid={`select-category-${index}`}>
                                    <div className="flex items-center gap-1">
                                      <SelectValue>
                                        {currentCategory?.name || transaction.category}
                                      </SelectValue>
                                      <Edit2 className="h-3 w-3 text-[#C8A046] ml-1" />
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {transactionCategories.map((cat: any) => (
                                      <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-gray-600 dark:text-gray-400">{currentCategory?.name || transaction.category}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(transaction.date)}</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{transaction.description}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleConfirm(message.id, message.transactionPreviews!)}
                        disabled={confirmMutation.isPending || processedMessageIds.has(message.id)}
                        className="flex-1 rounded-full bg-gradient-to-r from-[#C8A046] to-[#D4AC58] text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="button-confirm-transaction"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {message.transactionPreviews.length > 1 ? `Confirm (${message.transactionPreviews.length})` : 'Confirm'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(message.id)}
                        disabled={processedMessageIds.has(message.id)}
                        className="flex-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
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
          
          {(parseMutation.isPending || analyticsMutation.isPending) && (
            <div className="flex justify-start">
              <div className="bg-white/80 dark:bg-[#1C2F4A]/80 backdrop-blur-md border border-[#C8A046]/20 rounded-3xl px-5 py-3 shadow-xl">
                <Loader2 className="h-4 w-4 animate-spin text-[#C8A046]" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Action Buttons - Navy & Gold Theme */}
      <div className="fixed right-6 bottom-32 lg:bottom-24 z-20 flex flex-col gap-3">
        <Button
          size="icon"
          onClick={() => setLocation('/analytics')}
          className="rounded-full bg-gradient-to-r from-[#1C2F4A] to-[#2A4A6F] text-white shadow-2xl"
          data-testid="button-fab-analytics"
          title="Analytics"
        >
          <BarChart3 />
        </Button>
        <Button
          size="icon"
          onClick={() => setLocation('/insights')}
          className="rounded-full bg-gradient-to-r from-[#C8A046] to-[#D4AC58] text-white shadow-2xl"
          data-testid="button-fab-insights"
          title="AI Insights"
        >
          <Sparkles />
        </Button>
      </div>

      {/* Input Bar - Navy & Gold Theme */}
      <div className="fixed bottom-0 left-0 right-0 z-10 p-4 bg-white/60 dark:bg-[#1C2F4A]/60 backdrop-blur-xl border-t border-[#C8A046]/20">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-center bg-white/80 dark:bg-[#1C2F4A]/80 backdrop-blur-md border-2 border-[#C8A046]/30 rounded-[28px] px-4 py-2 shadow-2xl">
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
              title="Scan receipt"
            >
              {ocrScanMutation.isPending ? (
                <Loader2 className="animate-spin text-[#C8A046]" />
              ) : (
                <Camera className="text-[#C8A046]" />
              )}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={
                chatMode === 'analytics' 
                  ? 'Ask about your finances...' 
                  : transactionType === 'expense' 
                    ? 'e.g., ₹500 groceries...' 
                    : 'e.g., ₹50k salary...'
              }
              className="border-0 focus-visible:ring-0 bg-transparent text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              disabled={parseMutation.isPending || analyticsMutation.isPending}
              data-testid="input-chat"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || parseMutation.isPending || analyticsMutation.isPending}
              className="rounded-full shrink-0 bg-gradient-to-r from-[#1C2F4A] to-[#C8A046] text-white shadow-lg"
              data-testid="button-send"
            >
              <Send />
            </Button>
          </div>
          
          {/* Quick Suggestions - Navy & Gold Pills */}
          <div className="flex gap-2 mt-3 flex-wrap justify-center">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => setInput(suggestion)}
                className="rounded-full text-xs bg-white/60 dark:bg-[#1C2F4A]/60 backdrop-blur-sm border border-[#C8A046]/30"
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
