"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react" ;
import {
  KIRA_CATALOGUE,
  KIRA_GROUPS,
  kiraYearlyCost,
  encodeKiraParams,
  decodeKiraParams,
  type KiraItem,
} from "@/lib/kira";
import { formatRM } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Calculator,
  Share2,
  Check,
  ArrowRight,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";

export function KiraCalculator() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Decode initial state from URL
  const [selected, setSelected] = useState<Map<string, number>>(() =>
    decodeKiraParams(searchParams.get("s")),
  );
  const [copied, setCopied] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  // Sync URL when selection changes
  useEffect(() => {
    const encoded = encodeKiraParams(selected);
    const currentParam = searchParams.get("s") ?? "";
    if (encoded !== currentParam) {
      const url = encoded ? `/kira?s=${encoded}` : "/kira";
      router.replace(url, { scroll: false });
    }
  }, [selected, router, searchParams]);

  const toggleItem = useCallback((slug: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(slug)) {
        next.delete(slug);
        setEditingSlug(null);
      } else {
        const item = KIRA_CATALOGUE.find((i) => i.slug === slug);
        if (item) next.set(slug, item.defaultAmount);
      }
      return next;
    });
  }, []);

  const updateAmount = useCallback((slug: string, amount: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (amount > 0) {
        next.set(slug, amount);
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSelected(new Map());
    setEditingSlug(null);
  }, []);

  const { monthlyTotal, yearlyTotal, selectedItems } = useMemo(() => {
    let monthly = 0;
    let yearly = 0;
    const items: (KiraItem & { customAmount: number })[] = [];
    for (const [slug, amount] of selected.entries()) {
      const catalogueItem = KIRA_CATALOGUE.find((i) => i.slug === slug);
      if (!catalogueItem) continue;
      monthly += amount;
      yearly += kiraYearlyCost(amount, catalogueItem.billingCycle);
      items.push({ ...catalogueItem, customAmount: amount });
    }
    return { monthlyTotal: monthly, yearlyTotal: yearly, selectedItems: items };
  }, [selected]);

  const handleShare = useCallback(async () => {
    const encoded = encodeKiraParams(selected);
    const url = `${window.location.origin}/kira${encoded ? `?s=${encoded}` : ""}`;
    const text = `I spend ${formatRM(monthlyTotal)}/month (${formatRM(yearlyTotal)}/year) on subscriptions! Check yours 👉`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: "LangganCheck — Berapa Aku Habis?", text, url });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selected, monthlyTotal, yearlyTotal]);

  const handleWhatsAppShare = useCallback(() => {
    const encoded = encodeKiraParams(selected);
    const url = `${window.location.origin}/kira${encoded ? `?s=${encoded}` : ""}`;
    const text = `I spend ${formatRM(monthlyTotal)}/month (${formatRM(yearlyTotal)}/year) on subscriptions! Check yours 👉\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }, [selected, monthlyTotal, yearlyTotal]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Calculator className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Berapa Aku Habis?
          </h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Tap the subscriptions you pay for — see how much you <em>actually</em> spend per month & year. No sign-up needed.
        </p>
      </div>

      {/* Sticky total bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-14 z-30 mb-6"
          >
            <Card className="border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-elevated">
              <CardContent className="py-4 px-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-baseline gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly</p>
                      <motion.p
                        key={monthlyTotal}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        className="text-xl font-semibold tabular-nums"
                      >
                        {formatRM(monthlyTotal)}
                      </motion.p>
                    </div>
                    <Separator orientation="vertical" className="h-8" />
                    <div>
                      <p className="text-xs text-muted-foreground">Yearly</p>
                      <motion.p
                        key={yearlyTotal}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        className="text-xl font-semibold tabular-nums text-destructive"
                      >
                        {formatRM(yearlyTotal)}
                      </motion.p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAll}
                      className="text-xs text-muted-foreground"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleWhatsAppShare}
                      className="text-xs"
                    >
                      <svg viewBox="0 0 24 24" className="mr-1 h-3.5 w-3.5 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleShare}
                      className="text-xs"
                    >
                      {copied ? (
                        <Check className="mr-1 h-3 w-3" />
                      ) : (
                        <Share2 className="mr-1 h-3 w-3" />
                      )}
                      {copied ? "Copied!" : "Share"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subscription grid by group */}
      <div className="space-y-6">
        {KIRA_GROUPS.map((group) => {
          const groupItems = KIRA_CATALOGUE.filter(
            (item) => item.group === group.key,
          );
          if (groupItems.length === 0) return null;

          return (
            <div key={group.key}>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {groupItems.map((item) => {
                  const isSelected = selected.has(item.slug);
                  const customAmount = selected.get(item.slug);
                  const isEditing = editingSlug === item.slug;

                  return (
                    <motion.div
                      key={item.slug}
                      layout
                      whileTap={{ scale: 0.97 }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleItem(item.slug)}
                        className={`relative w-full rounded-lg border p-3 text-left transition-colors ${
                          isSelected
                            ? "border-foreground/30 bg-foreground/5"
                            : "border-border hover:border-border/80 hover:bg-muted/50"
                        }`}
                      >
                        {/* Checkmark */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground"
                            >
                              <Check className="h-3 w-3 text-background" />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex items-center gap-2.5">
                          {/* Brand icon */}
                          <span
                            className="h-8 w-8 shrink-0 rounded-md bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: `url(${item.iconUrl})` }}
                            role="img"
                            aria-label={item.name}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {formatRM(customAmount ?? item.defaultAmount)}/mo
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Inline amount editor */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-center gap-1 pt-1.5 px-0.5">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const current = customAmount ?? item.defaultAmount;
                                  updateAmount(item.slug, Math.max(0.01, current - 5));
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={customAmount ?? item.defaultAmount}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val > 0) updateAmount(item.slug, val);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-7 text-center text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const current = customAmount ?? item.defaultAmount;
                                  updateAmount(item.slug, current + 5);
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA to sign up */}
      <div className="mt-10 text-center">
        <Separator className="mb-8" />
        <p className="mb-3 text-sm text-muted-foreground">
          Want to track all your subscriptions & BNPL payments with a calendar view?
        </p>
        <Button asChild size="lg">
          <Link href="/">
            Track semua FREE dengan LangganCheck
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
