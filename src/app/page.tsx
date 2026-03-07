import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getSession } from "@/lib/auth/session";
import { getItems, getBudget, getGajiDay } from "@/app/actions";

export default async function Home() {
  const session = await getSession();
  const isAuthenticated = Boolean(session);

  const [items, budget, gajiDay] = isAuthenticated
    ? await Promise.all([getItems(), getBudget(), getGajiDay()])
    : [[], null, 25];

  return (
    <DashboardClient
      isAuthenticated={isAuthenticated}
      initialItems={items}
      initialBudget={budget}
      initialGajiDay={gajiDay}
    />
  );
}
