"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRM } from "@/lib/format";
import { X } from "lucide-react";

const STORAGE_KEY = "langgancheck-donation-nudge-dismissed";
const MIN_ITEMS_TO_SHOW = 3;

interface DonationNudgeProps {
  itemCount: number;
  totalMonthlyCost: number;
}

function getDismissedUntil(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
  } catch {
    return 0;
  }
}

function dismissFor30Days() {
  try {
    const until = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, String(until));
  } catch {
    // noop
  }
}

export function DonationNudge({ itemCount, totalMonthlyCost }: DonationNudgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (itemCount < MIN_ITEMS_TO_SHOW) return;
    const dismissedUntil = getDismissedUntil();
    if (Date.now() < dismissedUntil) return;
    setVisible(true);
  }, [itemCount]);

  const handleDismiss = () => {
    dismissFor30Days();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -10 }}
          className="mt-8"
        >
          <Card className="group relative overflow-hidden border border-orange-200/50 bg-gradient-to-br from-orange-50/50 to-white shadow-sm dark:border-orange-900/50 dark:from-orange-950/20 dark:to-background">
            <div className="absolute inset-x-0 top-0 h-[2px] w-full bg-gradient-to-r from-orange-300 via-orange-500 to-orange-300 opacity-20" />
            <CardContent className="relative px-5 py-5 sm:px-6">
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 h-7 w-7 rounded-sm p-0 text-muted-foreground transition-colors hover:bg-orange-100 hover:text-orange-700 dark:hover:bg-orange-900/50 dark:hover:text-orange-300"
                onClick={handleDismiss}
              >
                <span className="sr-only">Dismiss</span>
                <X className="h-4 w-4" />
              </Button>
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100/80 shadow-sm ring-4 ring-white dark:bg-orange-500/20 dark:ring-background">
                  <span className="text-2xl drop-shadow-sm" role="img" aria-label="tea">
                    ☕
                  </span>
                </div>
                <div className="flex-1 space-y-1 sm:pr-8">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    Enjoying LangganCheck?
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    This app helps you track <span className="font-medium text-foreground">{formatRM(totalMonthlyCost)}/mo</span> in subscriptions for free. If it's helped you save money, consider buying the developer a teh tarik to keep the servers running!
                  </p>
                </div>
                <div className="mt-2 flex shrink-0 sm:mt-0">
                  <Button
                    size="sm"
                    className="h-9 rounded-full bg-orange-500 text-white shadow-sm transition-all hover:scale-105 hover:bg-orange-600 active:scale-95"
                    asChild
                  >
                    <a
                      href="https://buymeacoffee.com/fiansuf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-medium"
                    >
                      Belanja Teh Tarik!
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
