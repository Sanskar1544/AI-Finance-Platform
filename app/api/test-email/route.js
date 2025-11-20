// Create: app/api/test-email/route.js

import { sendEmail } from "@/actions/send-email";
import EmailTemplate from "@/emails/template";
import { NextResponse } from "next/server";

export async function GET() {
  console.log("Testing email sending...");

  // Test 1: Simple budget alert
  const result1 = await sendEmail({
    to: "srijangupta5566@gmail.com",
    subject: "Test Budget Alert from Alvestor",
    react: EmailTemplate({
      userName: "Test User",
      type: "budget-alert",
      data: {
        percentageUsed: 85,
        budgetAmount: 1000,
        totalExpenses: 850,
        accountName: "Test Account",
      },
    }),
  });

  console.log("Budget alert result:", result1);

  // Test 2: Monthly report
  const result2 = await sendEmail({
    to: "srijangupta5566@gmail.com",
    subject: "Test Monthly Report from Alvestor",
    react: EmailTemplate({
      userName: "Test User",
      type: "monthly-report",
      data: {
        month: "November",
        stats: {
          totalIncome: 5000,
          totalExpenses: 3500,
          byCategory: {
            food: 500,
            transport: 300,
          },
        },
        insights: [
          "Test insight 1",
          "Test insight 2",
          "Test insight 3",
        ],
      },
    }),
  });

  console.log("Monthly report result:", result2);

  return NextResponse.json({
    budgetAlert: result1,
    monthlyReport: result2,
  });
}