import { inngest } from "./client";
import { db } from "@/lib/prisma";
import EmailTemplate from "@/emails/template";
import { sendEmail } from "@/actions/send-email";
import OpenAI from "openai";

// ----------------------
// OpenAI Client
// ----------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ----------------------
// OpenAI Helper (Insights)
// ----------------------
async function generateFinancialInsights(stats, month) {
  // Check if there's actual data to analyze
  if (stats.totalExpenses === 0 && stats.totalIncome === 0) {
    return [
      "No transactions found for this month.",
      "Start tracking your expenses to get personalized insights.",
      "Add your income and expenses to see detailed analysis.",
    ];
  }

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

    IMPORTANT: Respond ONLY with a JSON array of exactly 3 strings. No markdown, no code blocks, just the array.
    Example: ["insight 1", "insight 2", "insight 3"]
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content.trim();
    console.log("Raw OpenAI response:", raw);
    
    // Remove any markdown code blocks
    const cleaned = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/^`|`$/g, "")
      .trim();
    
    console.log("Cleaned response:", cleaned);
    
    const parsed = JSON.parse(cleaned);
    
    // Validate it's an array with items
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 3); // Take first 3 items
    }
    
    throw new Error("Invalid response format");

  } catch (error) {
    console.error("Error generating insights:", error);

    return [
      `Your spending in ${month} totaled $${stats.totalExpenses.toFixed(2)}.`,
      "Track your expenses regularly to identify spending patterns.",
      "Consider setting category-specific budgets for better control.",
    ];
  }
}

// ----------------------
// RECURRING TRANSACTIONS
// ----------------------
export const processRecurringTransaction = inngest.createFunction(
  {
    id: "process-recurring-transaction",
    name: "Process Recurring Transaction",
    throttle: {
      limit: 10,
      period: "1m",
      key: "event.data.userId",
    },
  },
  { event: "transaction.recurring.process" },
  async ({ event, step }) => {
    if (!event?.data?.transactionId || !event?.data?.userId) {
      console.error("Invalid event data:", event);
      return { error: "Missing required event data" };
    }

    await step.run("process-transaction", async () => {
      const transaction = await db.transaction.findUnique({
        where: {
          id: event.data.transactionId,
          userId: event.data.userId,
        },
        include: { account: true },
      });

      if (!transaction || !isTransactionDue(transaction)) return;

      await db.$transaction(async (tx) => {
        // Add new transaction
        await tx.transaction.create({
          data: {
            type: transaction.type,
            amount: transaction.amount,
            description: `${transaction.description} (Recurring)`,
            date: new Date(),
            category: transaction.category,
            userId: transaction.userId,
            accountId: transaction.accountId,
            isRecurring: false,
          },
        });

        // Update balance
        const change =
          transaction.type === "EXPENSE"
            ? -transaction.amount.toNumber()
            : transaction.amount.toNumber();

        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: change } },
        });

        // Update next recurring date
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            lastProcessed: new Date(),
            nextRecurringDate: calculateNextRecurringDate(
              new Date(),
              transaction.recurringInterval
            ),
          },
        });
      });
    });
  }
);

// ----------------------
// TRIGGER RECURRING
// ----------------------
export const triggerRecurringTransactions = inngest.createFunction(
  {
    id: "trigger-recurring-transactions",
    name: "Trigger Recurring Transactions",
  },
  { cron: "0 0 * * *" },
  async ({ step }) => {
    const recurring = await step.run("fetch-recurring", async () => {
      return await db.transaction.findMany({
        where: {
          isRecurring: true,
          status: "COMPLETED",
          OR: [
            { lastProcessed: null },
            { nextRecurringDate: { lte: new Date() } },
          ],
        },
      });
    });

    if (recurring.length > 0) {
      await inngest.send(
        recurring.map((t) => ({
          name: "transaction.recurring.process",
          data: {
            transactionId: t.id,
            userId: t.userId,
          },
        }))
      );
    }

    return { triggered: recurring.length };
  }
);

// ----------------------
// MONTHLY REPORTS
// ----------------------
export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
  },
  { cron: "0 0 1 * *" },
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      const fetchedUsers = await db.user.findMany({ include: { accounts: true } });
      console.log(`Found ${fetchedUsers.length} users for monthly reports`);
      return fetchedUsers;
    });

    for (const user of users) {
      await step.run(`generate-report-${user.id}`, async () => {
        console.log(`Processing monthly report for ${user.email}`);
        
        // Get default account or first account
        const defaultAccount = user.accounts.find(acc => acc.isDefault) || user.accounts[0];
        
        if (!defaultAccount) {
          console.log(`No account found for user ${user.id}`);
          return;
        }

        console.log(`Using account: ${defaultAccount.name} (${defaultAccount.id})`);

        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const stats = await getMonthlyStats(user.id, defaultAccount.id, lastMonth);
        console.log(`Stats for ${user.email}:`, JSON.stringify(stats, null, 2));
        
        const monthName = lastMonth.toLocaleString("default", { month: "long" });

        const insights = await generateFinancialInsights(stats, monthName);
        console.log(`Generated ${insights.length} insights for ${user.email}`);

        const emailResult = await sendEmail({
          to: "srijangupta5566@gmail.com", // CHANGED: Use your verified email for testing
          subject: `Your Monthly Report - ${monthName} - ${defaultAccount.name}`,
          react: EmailTemplate({
            userName: user.name,
            type: "monthly-report",
            data: { 
              stats, 
              month: monthName, 
              insights,
              accountName: defaultAccount.name
            },
          }),
        });

        console.log(`Email result for ${user.email}:`, emailResult.success ? "Success" : "Failed");
      });
    }

    return { processed: users.length };
  }
);

// ----------------------
// BUDGET ALERTS
// ----------------------
export const checkBudgetAlerts = inngest.createFunction(
  { name: "Check Budget Alerts" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const budgets = await step.run("fetch-budgets", async () => {
      const fetchedBudgets = await db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: { where: { isDefault: true } },
            },
          },
        },
      });
      console.log(`Found ${fetchedBudgets.length} budgets to check`);
      return fetchedBudgets;
    });

    let alertsSent = 0;

    for (const budget of budgets) {
      const defaultAccount = budget.user.accounts[0];
      if (!defaultAccount) {
        console.log(`No default account for user ${budget.user.email}`);
        continue;
      }

      await step.run(`check-budget-${budget.id}`, async () => {
        const start = new Date();
        start.setDate(1);

        const expenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            accountId: defaultAccount.id,
            type: "EXPENSE",
            date: { gte: start },
          },
          _sum: { amount: true },
        });

        const total = expenses._sum.amount?.toNumber() || 0;
        const percent = (total / budget.amount) * 100;

        console.log(`Budget check for ${budget.user.email}:`, {
          budgetAmount: budget.amount,
          totalExpenses: total,
          percentageUsed: percent.toFixed(1) + "%",
          lastAlertSent: budget.lastAlertSent,
        });

        if (
          percent >= 80 &&
          (!budget.lastAlertSent ||
            isNewMonth(new Date(budget.lastAlertSent), new Date()))
        ) {
          console.log(`Sending budget alert to ${budget.user.email}`);
          
          const emailResult = await sendEmail({
            to: "srijangupta5566@gmail.com", // CHANGED: Use your verified email for testing
            subject: `Budget Alert - ${defaultAccount.name}`,
            react: EmailTemplate({
              userName: budget.user.name,
              type: "budget-alert",
              data: {
                percentageUsed: percent,
                budgetAmount: budget.amount,
                totalExpenses: total,
                accountName: defaultAccount.name,
              },
            }),
          });

          console.log(`Budget alert email result:`, emailResult.success ? "Success" : "Failed");

          await db.budget.update({
            where: { id: budget.id },
            data: { lastAlertSent: new Date() },
          });

          alertsSent++;
        } else {
          console.log(`No alert needed for ${budget.user.email} (${percent.toFixed(1)}% used)`);
        }
      });
    }

    return { budgetsChecked: budgets.length, alertsSent };
  }
);

// ----------------------
// Utility Helpers
// ----------------------
function isNewMonth(last, now) {
  return (
    last.getMonth() !== now.getMonth() ||
    last.getFullYear() !== now.getFullYear()
  );
}

function isTransactionDue(t) {
  if (!t.lastProcessed) return true;
  return new Date(t.nextRecurringDate) <= new Date();
}

function calculateNextRecurringDate(date, interval) {
  const next = new Date(date);

  switch (interval) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

async function getMonthlyStats(userId, accountId, month) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      accountId,
      date: { gte: start, lte: end },
    },
  });

  return transactions.reduce(
    (stats, t) => {
      const amt = t.amount.toNumber();

      if (t.type === "EXPENSE") {
        stats.totalExpenses += amt;
        stats.byCategory[t.category] =
          (stats.byCategory[t.category] || 0) + amt;
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
}