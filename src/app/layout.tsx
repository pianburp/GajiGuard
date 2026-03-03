import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSession } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/navbar";
import { OneTapPrompt } from "@/components/auth/auth-button";
import { ThemeTogglerButton } from "@/components/animate-ui/components/buttons/theme-toggler";
import { CopyButton } from "@/components/animate-ui/components/buttons/copy";

export const metadata: Metadata = {
  title: "LangganCheck — Subscription & BNPL Tracker",
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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          themes={["light", "dark"]}
        >
          <TooltipProvider delayDuration={0}>
            <div className="flex min-h-screen flex-col">
              <Navbar isAuthenticated={isAuthenticated} email={session?.user?.email} avatarUrl={session?.user?.image ?? undefined} />
              {!isAuthenticated && <OneTapPrompt />}
              <main className="flex-1">{children}</main>
              <footer className="flex items-center justify-between w-full text-sm text-muted-foreground py-4 px-4">
                <div className="flex items-center gap-2">
                  <p>Contact me! fiansuf@gmail.com</p>
                  <CopyButton
                    variant="ghost"
                    size="xs"
                    content="fiansuf@gmail.com"
                    aria-label="Copy email"
                  />
                </div>
                <ThemeTogglerButton variant="ghost" />
              </footer>
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
