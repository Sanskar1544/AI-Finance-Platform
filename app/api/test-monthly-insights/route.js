import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateFinancialInsights(stats, month) {
  const prompt = `
    Analyze this financial data and provide 3 concise, actionable insights.
    Keep it helpful and conversational.

    Financial Data for ${month}:
    - Total Income: $${stats.totalIncome}
    - Total Expenses: $${stats.totalExpenses}
    - Net Income: $${stats.totalIncome - stats.totalExpenses}
    - Expense Categories: ${Object.entries(stats.byCategory)
      .map(([category, amount]) => `${category}: $${amount}`)
      .join(", ")}

    Format the response as:
    ["insight 1", "insight 2", "insight 3"]
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content.trim();
    console.log("Raw OpenAI response:", raw);
    
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log("Cleaned response:", cleaned);
    
    return JSON.parse(cleaned);

  } catch (error) {
    console.error("Error generating insights:", error);

    return [
      "Your biggest expense category needs a closer look.",
      "Try setting a simple monthly budget for better control.",
      "Review recurring expenses – some may be unnecessary.",
    ];
  }
}

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkUserId },
      include: { accounts: true },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const defaultAccount = user.accounts.find(acc => acc.isDefault) || user.accounts[0];
    
    if (!defaultAccount) {
      return Response.json({ error: "No account found" }, { status: 404 });
    }

    // Get last month's data
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const start = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const end = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        accountId: defaultAccount.id,
        date: { gte: start, lte: end },
      },
    });

    const stats = transactions.reduce(
      (stats, t) => {
        const amt = t.amount.toNumber();

        if (t.type === "EXPENSE") {
          stats.totalExpenses += amt;
          stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + amt;
        } else {
          stats.totalIncome += amt;
        }

        return stats;
      },
      {
        totalExpenses: 0,
        totalIncome: 0,
        byCategory: {},
        transactionCount: transactions.length,
      }
    );

    const monthName = lastMonth.toLocaleString("default", { month: "long" });

    console.log("Stats being sent to AI:", stats);

    // Generate insights
    const insights = await generateFinancialInsights(stats, monthName);

    console.log("Generated insights:", insights);

    return Response.json({
      success: true,
      month: monthName,
      stats,
      insights,
      insightsCount: insights.length,
      hasInsights: insights && insights.length > 0,
    });

  } catch (error) {
    console.error("Test insights error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}