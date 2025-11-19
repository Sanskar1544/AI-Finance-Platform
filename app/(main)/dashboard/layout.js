import DashboardPage from "./page";
import { BarLoader } from "react-spinners";
import { Suspense } from "react";

export default function Layout() {
  return (
    <div className="px-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-6xl font-bold tracking-tight gradient-title">
          Dashboard
        </h1>
      </div>
      <div className="w-full min-h-[350px]">
        <Suspense
          fallback={
            <div className="w-full">
              <BarLoader className="mt-4" width={"100%"} color="#9333ea" />
            </div>
          }
        >
          <DashboardPage />
        </Suspense>
      </div>
    </div>
  );
}
