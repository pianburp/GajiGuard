import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSession } from "@/lib/session";
import { Navbar } from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: "GajiGuard — Subscription & BNPL Tracker",
  description: "Track subscriptions and BNPL commitments with a monthly calendar view.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const isAuthenticated = Boolean(session);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <TooltipProvider delayDuration={0}>
          <div className="flex min-h-screen flex-col">
            <Navbar isAuthenticated={isAuthenticated} email={session?.user?.email} />
            <main className="flex-1">{children}</main>
            <footer className="text-center text-sm text-muted-foreground py-4">
              Credit to fiansuf@gmail.com
            </footer>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
