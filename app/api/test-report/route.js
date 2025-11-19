import { db } from "@/lib/prisma";
import EmailTemplate from "@/emails/template";
import { sendEmail } from "@/actions/send-email";
import { auth } from "@clerk/nextjs/server";

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

    // Send test email
    const result = await sendEmail({
      to: "srijangupta5566@gmail.com",
      subject: `TEST - Your Monthly Report - ${monthName}`,
      react: EmailTemplate({
        userName: user.name,
        type: "monthly-report",
        data: { 
          stats, 
          month: monthName, 
          insights: ["Test insight 1", "Test insight 2", "Test insight 3"],
          accountName: defaultAccount.name
        },
      }),
    });

    return Response.json({
      success: true,
      user: user.email,
      account: defaultAccount.name,
      transactions: transactions.length,
      stats,
      emailResult: result,
    });

  } catch (error) {
    console.error("Test report error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}