import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react";
import type { Category } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
// @ts-ignore - papaparse has export issues with TypeScript
import Papa from "papaparse";

interface CSVRow {
  [key: string]: string;
}

interface MappedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId?: string;
}

export default function ImportPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    date: '',
    description: '',
    amount: '',
    type: '',
  });
  const [defaultType, setDefaultType] = useState<'income' | 'expense'>('expense');
  const [dateFormat, setDateFormat] = useState<'auto' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'>('auto');
  const [previewTransactions, setPreviewTransactions] = useState<MappedTransaction[]>([]);
  const [parseErrors, setParseErrors] = useState<{ row: number; field: string; value: string; error: string }[]>([]);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const importMutation = useMutation({
    mutationFn: async (transactions: MappedTransaction[]) => {
      const response = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transactions }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to import transactions");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${previewTransactions.length} transactions imported successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      resetImport();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error.message,
      });
    },
  });

  const parseCSV = (text: string): CSVRow[] => {
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
      delimiter: "", // Auto-detect
    });
    
    return result.data as CSVRow[];
  };

  const parseDate = (dateStr: string, rowIndex: number): { date: string; error?: string } => {
    if (!dateStr) {
      return { 
        date: new Date().toISOString(), 
        error: 'Empty date field, using current date' 
      };
    }
    
    // Try ISO format (YYYY-MM-DD) first
    const isoMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (isoMatch && (dateFormat === 'YYYY-MM-DD' || dateFormat === 'auto')) {
      const [, year, month, day] = isoMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return { date: date.toISOString() };
      }
    }
    
    // For non-ISO formats, parse based on selected format or auto-detect
    const slashMatch = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (slashMatch) {
      const [, first, second, year] = slashMatch;
      
      if (dateFormat === 'DD/MM/YYYY') {
        // Explicit DD/MM format
        const date = new Date(parseInt(year), parseInt(second) - 1, parseInt(first));
        if (!isNaN(date.getTime()) && parseInt(first) <= 31 && parseInt(second) <= 12) {
          return { date: date.toISOString() };
        }
      } else if (dateFormat === 'MM/DD/YYYY') {
        // Explicit MM/DD format
        const date = new Date(parseInt(year), parseInt(first) - 1, parseInt(second));
        if (!isNaN(date.getTime()) && parseInt(first) <= 12) {
          return { date: date.toISOString() };
        }
      } else if (dateFormat === 'auto') {
        // Auto-detect: try DD/MM first (more common internationally)
        const firstNum = parseInt(first);
        const secondNum = parseInt(second);
        
        if (firstNum > 12) {
          // Must be DD/MM (day is >12)
          const date = new Date(parseInt(year), secondNum - 1, firstNum);
          if (!isNaN(date.getTime())) {
            return { date: date.toISOString() };
          }
        } else if (secondNum > 12) {
          // Must be MM/DD (second value is >12)
          const date = new Date(parseInt(year), firstNum - 1, secondNum);
          if (!isNaN(date.getTime())) {
            return { date: date.toISOString() };
          }
        } else {
          // Ambiguous - default to DD/MM but warn
          const date = new Date(parseInt(year), secondNum - 1, firstNum);
          if (!isNaN(date.getTime())) {
            return { 
              date: date.toISOString(),
              error: `Ambiguous date '${dateStr}' - interpreted as DD/MM/YYYY. Select explicit format if incorrect.`
            };
          }
        }
      }
    }
    
    // If all parsing fails, return error
    return { 
      date: new Date().toISOString(), 
      error: `Failed to parse date '${dateStr}' with format ${dateFormat}` 
    };
  };

  const parseAmount = (amountStr: string): { amount: number; isNegative: boolean } => {
    if (!amountStr) return { amount: 0, isNegative: false };
    
    // Check for accounting format (negative in parentheses)
    const accountingMatch = amountStr.match(/^\((.+)\)$/);
    if (accountingMatch) {
      const value = parseFloat(accountingMatch[1].replace(/[^0-9.-]/g, ''));
      return { amount: Math.abs(value), isNegative: true };
    }
    
    // Remove currency symbols and parse
    const cleaned = amountStr.replace(/[^0-9.-]/g, '');
    const value = parseFloat(cleaned);
    
    return { 
      amount: Math.abs(value), 
      isNegative: value < 0 
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.csv')) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload a CSV file",
      });
      return;
    }

    setFile(uploadedFile);
    const text = await uploadedFile.text();
    const parsed = parseCSV(text);
    setCsvData(parsed);
    
    if (parsed.length > 0) {
      const fileHeaders = Object.keys(parsed[0]);
      setHeaders(fileHeaders);
      
      // Auto-detect common column names
      const lowerHeaders = fileHeaders.map(h => h.toLowerCase());
      const autoMapping: any = {};
      
      if (lowerHeaders.some(h => h.includes('date'))) {
        autoMapping.date = fileHeaders[lowerHeaders.findIndex(h => h.includes('date'))];
      }
      if (lowerHeaders.some(h => h.includes('description') || h.includes('narration') || h.includes('details'))) {
        autoMapping.description = fileHeaders[lowerHeaders.findIndex(h => h.includes('description') || h.includes('narration') || h.includes('details'))];
      }
      if (lowerHeaders.some(h => h.includes('amount') || h.includes('debit') || h.includes('credit'))) {
        autoMapping.amount = fileHeaders[lowerHeaders.findIndex(h => h.includes('amount') || h.includes('debit') || h.includes('credit'))];
      }
      if (lowerHeaders.some(h => h.includes('type') || h.includes('transaction type'))) {
        autoMapping.type = fileHeaders[lowerHeaders.findIndex(h => h.includes('type') || h.includes('transaction type'))];
      }
      
      setColumnMapping(prev => ({ ...prev, ...autoMapping }));
    }
  };

  const generatePreview = () => {
    if (!columnMapping.date || !columnMapping.description || !columnMapping.amount) {
      toast({
        variant: "destructive",
        title: "Missing mappings",
        description: "Please map Date, Description, and Amount columns",
      });
      return;
    }

    const errors: { row: number; field: string; value: string; error: string }[] = [];
    const transactions: MappedTransaction[] = csvData.map((row, idx) => {
      const { amount, isNegative } = parseAmount(row[columnMapping.amount] || '0');
      
      // Determine transaction type
      let type: 'income' | 'expense' = defaultType;
      if (columnMapping.type && row[columnMapping.type]) {
        const typeValue = row[columnMapping.type].toLowerCase();
        if (typeValue.includes('credit') || typeValue.includes('income') || typeValue.includes('deposit')) {
          type = 'income';
        } else if (typeValue.includes('debit') || typeValue.includes('expense') || typeValue.includes('withdrawal')) {
          type = 'expense';
        }
      } else if (isNegative) {
        // Amount was negative (including accounting format)
        type = 'expense';
      }

      // Parse date with improved handling
      const { date, error: dateError } = parseDate(row[columnMapping.date], idx);
      if (dateError) {
        errors.push({ row: idx + 1, field: 'date', value: row[columnMapping.date], error: dateError });
      }

      // Auto-categorize based on description
      const description = row[columnMapping.description] || 'Imported transaction';
      const categoryId = autoCategorize(description, type);

      return {
        date,
        description,
        amount,
        type,
        categoryId,
      };
    }).filter(t => t.amount > 0); // Filter out zero amounts
    
    setParseErrors(errors);

    setPreviewTransactions(transactions);
    toast({
      title: "Preview generated",
      description: `${transactions.length} transactions ready to import`,
    });
  };

  const autoCategorize = (description: string, type: 'income' | 'expense'): string | undefined => {
    if (!categories) return undefined;

    const desc = description.toLowerCase();
    const typeCategories = categories.filter(c => c.type === type);

    // Simple keyword matching
    const keywords: { [key: string]: string[] } = {
      'Food & Dining': ['restaurant', 'food', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'zomato', 'swiggy'],
      'Transportation': ['uber', 'ola', 'taxi', 'cab', 'fuel', 'petrol', 'gas', 'metro', 'bus'],
      'Shopping': ['amazon', 'flipkart', 'shopping', 'mall', 'store'],
      'Entertainment': ['movie', 'cinema', 'netflix', 'spotify', 'game'],
      'Utilities': ['electricity', 'water', 'internet', 'mobile', 'phone', 'recharge'],
      'Groceries': ['grocery', 'supermarket', 'vegetables', 'fruits'],
      'Salary': ['salary', 'payroll', 'wages'],
    };

    for (const category of typeCategories) {
      const categoryKeywords = keywords[category.name] || [];
      if (categoryKeywords.some(keyword => desc.includes(keyword))) {
        return category.id;
      }
    }

    return undefined;
  };

  const handleImport = () => {
    if (previewTransactions.length === 0) {
      toast({
        variant: "destructive",
        title: "No transactions",
        description: "Please generate preview first",
      });
      return;
    }

    if (parseErrors.length > 0) {
      toast({
        variant: "destructive",
        title: `${parseErrors.length} parsing warnings detected`,
        description: "Some dates may be incorrect. Review warnings before importing.",
      });
      // Still allow import but with strong warning
    }

    importMutation.mutate(previewTransactions);
  };

  const resetImport = () => {
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setColumnMapping({ date: '', description: '', amount: '', type: '' });
    setPreviewTransactions([]);
    setParseErrors([]);
    setDateFormat('auto');
  };

  const downloadSample = () => {
    const sampleCSV = `Date,Description,Amount,Type
2024-01-15,Grocery Shopping,1500,expense
2024-01-16,Salary Credit,50000,income
2024-01-17,Uber Ride,250,expense
2024-01-18,Restaurant Bill,800,expense`;

    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_transactions.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold">Import Data</h1>
        <p className="text-muted-foreground mt-1">Upload CSV files to import historical transactions</p>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Import</CardTitle>
          <CardDescription>Follow these steps to import your financial data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">1</div>
            <div>
              <p className="font-medium">Prepare your CSV file</p>
              <p className="text-sm text-muted-foreground">Export transactions from your bank or create a CSV with columns: Date, Description, Amount</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">2</div>
            <div>
              <p className="font-medium">Upload and map columns</p>
              <p className="text-sm text-muted-foreground">Map your CSV columns to transaction fields (we'll auto-detect common formats)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">3</div>
            <div>
              <p className="font-medium">Preview and import</p>
              <p className="text-sm text-muted-foreground">Review the data and import to add transactions to your account</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={downloadSample} className="mt-2" data-testid="button-download-sample">
            <Download className="h-4 w-4 mr-2" />
            Download Sample CSV
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>Select a CSV file containing your transaction data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover-elevate transition-all">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
                data-testid="input-csv-file"
              />
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm font-medium">
                  {file ? file.name : 'Click to upload CSV file'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
              </Label>
            </div>
            {file && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{csvData.length} rows found</p>
                </div>
                <CheckCircle className="h-5 w-5 text-chart-3" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      {headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>Match your CSV columns to transaction fields</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date Column *</Label>
                <Select value={columnMapping.date} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, date: v }))}>
                  <SelectTrigger data-testid="select-date-column">
                    <SelectValue placeholder="Select date column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description Column *</Label>
                <Select value={columnMapping.description} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, description: v }))}>
                  <SelectTrigger data-testid="select-description-column">
                    <SelectValue placeholder="Select description column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount Column *</Label>
                <Select value={columnMapping.amount} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, amount: v }))}>
                  <SelectTrigger data-testid="select-amount-column">
                    <SelectValue placeholder="Select amount column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type Column (Optional)</Label>
                <Select value={columnMapping.type} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger data-testid="select-type-column">
                    <SelectValue placeholder="Auto-detect from amount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto-detect</SelectItem>
                    {headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Date Format</Label>
              <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as typeof dateFormat)}>
                <SelectTrigger data-testid="select-date-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (European)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Select your CSV date format to avoid parsing errors</p>
            </div>
            <div>
              <Label>Default Transaction Type</Label>
              <Select value={defaultType} onValueChange={(v) => setDefaultType(v as 'income' | 'expense')}>
                <SelectTrigger data-testid="select-default-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Used when type cannot be auto-detected</p>
            </div>
            <Button onClick={generatePreview} className="w-full" data-testid="button-generate-preview">
              Generate Preview
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Parse Warnings ({parseErrors.length})</CardTitle>
            </div>
            <CardDescription>Some fields could not be parsed correctly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {parseErrors.slice(0, 5).map((err, idx) => (
                <div key={idx} className="text-sm p-2 bg-background rounded border border-destructive/20">
                  <p className="font-medium">Row {err.row}: {err.error}</p>
                  <p className="text-xs text-muted-foreground">Value: {err.value}</p>
                </div>
              ))}
              {parseErrors.length > 5 && (
                <p className="text-xs text-muted-foreground">... and {parseErrors.length - 5} more warnings</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {previewTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview ({previewTransactions.length} transactions)</CardTitle>
            <CardDescription>Review before importing {parseErrors.length > 0 && `(${parseErrors.length} warnings)`}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {previewTransactions.slice(0, 10).map((txn, idx) => {
                const category = categories?.find(c => c.id === txn.categoryId);
                return (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`preview-transaction-${idx}`}>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{txn.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(txn.date).toLocaleDateString()} • {category?.name || 'Uncategorized'}
                      </p>
                    </div>
                    <div className={`font-semibold ${txn.type === 'income' ? 'text-chart-3' : 'text-destructive'}`}>
                      {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toFixed(2)}
                    </div>
                  </div>
                );
              })}
              {previewTransactions.length > 10 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  ... and {previewTransactions.length - 10} more
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={handleImport} className="flex-1" disabled={importMutation.isPending} data-testid="button-import-transactions">
                {importMutation.isPending ? 'Importing...' : `Import ${previewTransactions.length} Transactions`}
              </Button>
              <Button variant="outline" onClick={resetImport} data-testid="button-reset-import">
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-primary">Import Tips</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• Transactions are automatically categorized based on description keywords</p>
          <p>• Negative amounts are automatically detected as expenses</p>
          <p>• Duplicate transactions won't affect your data - each import creates new entries</p>
          <p>• Date formats are automatically detected (YYYY-MM-DD, DD/MM/YYYY, etc.)</p>
        </CardContent>
      </Card>
    </div>
  );
}
