import { db } from "./db";
import { categories } from "@shared/schema";

const defaultCategories = [
  // Expense categories
  { name: "Food", type: "expense", icon: "UtensilsCrossed", color: "hsl(var(--chart-1))" },
  { name: "Transport", type: "expense", icon: "Car", color: "hsl(var(--chart-2))" },
  { name: "Shopping", type: "expense", icon: "ShoppingBag", color: "hsl(var(--chart-3))" },
  { name: "Bills", type: "expense", icon: "FileText", color: "hsl(var(--chart-4))" },
  { name: "Entertainment", type: "expense", icon: "Film", color: "hsl(var(--chart-5))" },
  { name: "Healthcare", type: "expense", icon: "Heart", color: "hsl(var(--chart-1))" },
  { name: "Education", type: "expense", icon: "GraduationCap", color: "hsl(var(--chart-2))" },
  { name: "Other", type: "expense", icon: "MoreHorizontal", color: "hsl(var(--chart-3))" },
  // Income categories
  { name: "Salary", type: "income", icon: "Wallet", color: "hsl(var(--chart-4))" },
  { name: "Freelance", type: "income", icon: "Briefcase", color: "hsl(var(--chart-5))" },
  { name: "Investment", type: "income", icon: "TrendingUp", color: "hsl(var(--chart-1))" },
  { name: "Gift", type: "income", icon: "Gift", color: "hsl(var(--chart-2))" },
];

export async function seedCategories() {
  try {
    const existing = await db.select().from(categories);
    if (existing.length === 0) {
      await db.insert(categories).values(defaultCategories);
      console.log("✓ Seeded default categories");
    }
  } catch (error) {
    console.error("Error seeding categories:", error);
  }
}
