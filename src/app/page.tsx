import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getSession } from "@/lib/auth/session";
import { getDashboardData } from "@/app/actions";

export default async function Home() {
  const session = await getSession();
  const isAuthenticated = Boolean(session);

  const now = new Date();
  const initialYear = now.getFullYear();
  const initialMonth = now.getMonth();
  const initialDashboardData = isAuthenticated
    ? await getDashboardData(initialYear, initialMonth)
    : null;

  return (
    <DashboardClient
      isAuthenticated={isAuthenticated}
      initialDashboardData={initialDashboardData}
      initialYear={initialYear}
      initialMonth={initialMonth}
    />
  );
}
