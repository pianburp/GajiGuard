import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getSession } from "@/lib/session";
import { getItems, getUserPlan } from "@/actions";

export default async function Home() {
  const session = await getSession();
  const isAuthenticated = Boolean(session);

  const [items, plan] = isAuthenticated
    ? await Promise.all([getItems(), getUserPlan()])
    : [[], "free" as const];

  return (
    <DashboardClient
      isAuthenticated={isAuthenticated}
      initialItems={items}
      initialPlan={plan}
    />
  );
}
