import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkUserId },
      include: { 
        accounts: true,
        budgets: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const budget = user.budgets[0];
    if (!budget) {
      return Response.json({ 
        error: "No budget found",
        hint: "Create a budget in your app first"
      }, { status: 404 });
    }

    const defaultAccount = user.accounts.find(acc => acc.isDefault) || user.accounts[0];
    
    // Get current month expenses
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const expenses = await db.transaction.aggregate({
      where: {
        userId: user.id,
        accountId: defaultAccount.id,
        type: "EXPENSE",
        date: { gte: start },
      },
      _sum: { amount: true },
    });

    const total = expenses._sum.amount?.toNumber() || 0;
    const percent = (total / budget.amount) * 100;

    const isNewMonth = (last, now) => {
      if (!last) return true;
      return (
        last.getMonth() !== now.getMonth() ||
        last.getFullYear() !== now.getFullYear()
      );
    };

    const shouldSendAlert = percent >= 80 && isNewMonth(budget.lastAlertSent, new Date());

    return Response.json({
      success: true,
      budget: {
        amount: budget.amount,
        totalExpenses: total,
        percentageUsed: percent.toFixed(1) + "%",
        remaining: budget.amount - total,
      },
      alertStatus: {
        shouldSendAlert,
        reasons: {
          isOver80Percent: percent >= 80,
          isNewMonthSinceLastAlert: isNewMonth(budget.lastAlertSent, new Date()),
          lastAlertSent: budget.lastAlertSent,
        }
      },
      currentMonth: {
        startDate: start,
        transactionsCount: await db.transaction.count({
          where: {
            userId: user.id,
            accountId: defaultAccount.id,
            type: "EXPENSE",
            date: { gte: start },
          },
        }),
      }
    });

  } catch (error) {
    console.error("Check budget status error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}