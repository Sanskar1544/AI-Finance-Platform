import { inngest } from "@/lib/src/inngest/client";
import { checkBudgetAlerts, generateMonthlyReports, processRecurringTransaction, triggerRecurringTransactions } from "@/lib/src/inngest/functions";
import { serve } from "inngest/next";


export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processRecurringTransaction,
    triggerRecurringTransactions,
    generateMonthlyReports,
    checkBudgetAlerts,
  ],
});