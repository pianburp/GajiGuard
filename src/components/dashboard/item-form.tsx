"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CATEGORY_OPTIONS, ITEM_COLORS } from "@/lib/constants";
import { toLocalDateKey } from "@/lib/date";
import {
  findRecognizedSubscriptionByName,
  getBrandfetchIconUrl,
  searchRecognizedSubscriptions,
  searchBnplSubscriptions,
  suggestCategoryForItem,
} from "@/lib/brandfetch";
import type { BillingCycle, Category, Item, ItemType } from "@/lib/domain/types";
import { Checkbox } from "@/components/animate-ui/components/headless/checkbox";
import {
  Calendar,
  CreditCard,
  FileText,
  Package,
  Palette,
  Percent,
  Tag,
  Hash,
  CalendarDays,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandIcon } from "@/components/dashboard/brand-icon";

interface ItemFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: Item) => void;
  editItem: Item | null;
}

function todayDate(): string {
  return toLocalDateKey(new Date());
}

function makeId(): string {
  return crypto.randomUUID();
}

type ItemDraft = {
  type: ItemType;
  name: string;
  brandIconUrl: string;
  recognizedDomain: string;
  amount: string;
  billingCycle: BillingCycle;
  billingDay: string;
  startDate: string;
  category: Category;
  color: string;
  notes: string;
  isShariah: boolean;
  interestRate: string;
  totalInstallments: string;
  installmentsPaid: string;
};

function toDraft(editItem: Item | null): ItemDraft {
  const recognized = findRecognizedSubscriptionByName(editItem?.name ?? "");

  return {
    type: editItem?.type ?? "subscription",
    name: editItem?.name ?? "",
    brandIconUrl:
      editItem?.brandIconUrl ??
      (recognized ? getBrandfetchIconUrl(recognized.domain) : ""),
    recognizedDomain: recognized?.domain ?? "",
    amount: String(editItem?.amount ?? ""),
    billingCycle: editItem?.billingCycle ?? "monthly",
    billingDay: String(editItem?.billingDay ?? 1),
    startDate: editItem?.startDate ?? todayDate(),
    category: editItem?.category ?? "other",
    color: editItem?.color ?? ITEM_COLORS[0],
    notes: editItem?.notes ?? "",
    isShariah: editItem?.isShariah ?? false,
    interestRate: String(editItem?.interestRate ?? 0),
    totalInstallments: String(editItem?.totalInstallments ?? 6),
    installmentsPaid: String(editItem?.installmentsPaid ?? 0),
  };
}

export function ItemForm({ open, onClose, onSave, editItem }: ItemFormProps) {
  const [draft, setDraft] = useState(() => toDraft(editItem));
  const [errors, setErrors] = useState<{
    billingDay?: string;
    totalInstallments?: string;
    installmentsPaid?: string;
    interestRate?: string;
  }>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameWrapperRef = useRef<HTMLDivElement>(null);
  const { type } = draft;
  const trimmedName = draft.name.trim();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (nameWrapperRef.current && !nameWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cycleOptions = useMemo(() => {
    if (type === "bnpl") return ["weekly", "biweekly", "monthly"] as const;
    return ["weekly", "monthly", "yearly"] as const;
  }, [type]);

  const nameSuggestions = useMemo(() => {
    if (!trimmedName) return [];
    if (type === "bnpl") return searchBnplSubscriptions(trimmedName, 4);
    return searchRecognizedSubscriptions(trimmedName, 6);
  }, [type, trimmedName]);

  const billingDayError = useMemo(() => {
    const value = draft.billingDay.trim();
    if (!value) return "Billing day is required.";
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31)
      return "Billing day must be a whole number between 1 and 31.";
    return undefined;
  }, [draft.billingDay]);

  const handleSubmit = () => {
    const parsedAmount = Number(draft.amount);
    const parsedBillingDay = Number(draft.billingDay);
    const parsedTotal = Number(draft.totalInstallments);
    const parsedPaid = Number(draft.installmentsPaid);
    const parsedInterestRate = Number(draft.interestRate);
    const nextErrors: typeof errors = {};

    if (!draft.name.trim() || parsedAmount <= 0) return;
    if (
      !Number.isInteger(parsedBillingDay) ||
      parsedBillingDay < 1 ||
      parsedBillingDay > 31
    ) {
      nextErrors.billingDay = "Billing day must be a whole number between 1 and 31.";
    }
    if (draft.type === "bnpl") {
      if (!Number.isInteger(parsedTotal) || parsedTotal < 1) {
        nextErrors.totalInstallments =
          "Total installments must be a whole number of at least 1.";
      }
      if (!Number.isInteger(parsedPaid) || parsedPaid < 0) {
        nextErrors.installmentsPaid =
          "Installments paid must be a whole number of at least 0.";
      }
      if (
        Number.isInteger(parsedTotal) &&
        Number.isInteger(parsedPaid) &&
        parsedPaid > parsedTotal
      ) {
        nextErrors.installmentsPaid =
          "Installments paid cannot be greater than total installments.";
      }
      if (!draft.isShariah) {
        if (!Number.isFinite(parsedInterestRate) || parsedInterestRate < 0 || parsedInterestRate > 100) {
          nextErrors.interestRate = "Interest must be between 0 and 100%.";
        }
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    onSave({
      id: editItem?.id ?? makeId(),
      type: draft.type,
      name: draft.name.trim(),
      brandIconUrl: draft.brandIconUrl || null,
      amount: parsedAmount,
      currency: "MYR",
      billingCycle: draft.billingCycle,
      billingDay: parsedBillingDay,
      startDate: draft.startDate,
      category: draft.category as Item["category"],
      color: draft.color,
      notes: draft.notes.trim(),
      isActive: true,
      isShariah: draft.type === "bnpl" ? draft.isShariah : false,
      interestRate:
        draft.type === "bnpl" && !draft.isShariah ? parsedInterestRate : 0,
      totalInstallments: draft.type === "bnpl" ? parsedTotal : null,
      installmentsPaid: draft.type === "bnpl" ? parsedPaid : 0,
      paidDates: editItem?.paidDates ?? [],
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg">{editItem ? "Edit Item" : "Add New Item"}</DialogTitle>
          <DialogDescription>
            {editItem
              ? "Update your subscription or BNPL details."
              : "Track a new subscription or buy now, pay later commitment."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Type Selector */}
          <Tabs
            value={type}
            onValueChange={(v) =>
              setDraft((prev) => {
                const nextType = v as ItemType;
                return {
                  ...prev,
                  type: nextType,
                  category: suggestCategoryForItem(prev.name, nextType),
                  ...(nextType === "bnpl"
                    ? { recognizedDomain: "", brandIconUrl: "" }
                    : {}),
                };
              })
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="subscription" className="gap-2 text-xs">
                <CreditCard className="h-3.5 w-3.5" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="bnpl" className="gap-2 text-xs">
                <Package className="h-3.5 w-3.5" />
                BNPL
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Separator className="bg-border/60" />

          <div className="space-y-6">
            {/* Core Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  Name
                </Label>
                <div ref={nameWrapperRef} className="relative">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Input
                        id="name"
                        value={draft.name}
                        onChange={(e) => {
                          const nextName = e.target.value;
                          setDraft((prev) => ({
                            ...prev,
                            name: nextName,
                            category: suggestCategoryForItem(nextName, prev.type),
                            recognizedDomain: "",
                            brandIconUrl: "",
                          }));
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder={type === "bnpl" ? "e.g., Atome, Grab PayLater" : "e.g., Netflix, Spotify"}
                        maxLength={100}
                        autoComplete="off"
                        className="bg-muted/50 focus-visible:bg-background transition-colors h-11"
                      />
                    </div>
                    <BrandIcon
                      name={draft.name || "brand"}
                      iconUrl={draft.brandIconUrl}
                      className="h-11 w-11 shrink-0 ring-1 ring-border rounded-xl"
                    />
                  </div>
                  {showSuggestions && nameSuggestions.length > 0 && (
                    <div className="absolute left-0 right-14 top-full z-50 mt-1.5 max-h-52 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                      {nameSuggestions.map((subscription) => (
                        <button
                          key={`${subscription.domain}-${subscription.name}`}
                          type="button"
                          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                          onClick={() => {
                            setDraft((prev) => ({
                              ...prev,
                              name: subscription.name,
                              category: suggestCategoryForItem(subscription.name, prev.type),
                              recognizedDomain: subscription.domain,
                              brandIconUrl: getBrandfetchIconUrl(subscription.domain),
                            }));
                            setShowSuggestions(false);
                          }}
                        >
                          <BrandIcon
                            name={subscription.name}
                            iconUrl={getBrandfetchIconUrl(subscription.domain)}
                            className="h-6 w-6 rounded-md"
                          />
                          <span className="font-medium">{subscription.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <CreditCard className="h-3 w-3" />
                    Amount (RM)
                  </Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      min="0.01"
                      max="99999.99"
                      step="0.01"
                      value={draft.amount}
                      onChange={(e) => setDraft((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="pl-8 bg-muted/50 focus-visible:bg-background transition-colors h-10"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                      RM
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <LayoutGrid className="h-3 w-3" />
                    Category
                  </Label>
                  <Select
                    value={draft.category}
                    onValueChange={(v) => setDraft((prev) => ({ ...prev, category: v as Category }))}
                  >
                    <SelectTrigger className="bg-muted/50 focus:bg-background transition-colors h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="bg-border/60" />

            {/* Billing Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Billing Cycle
                  </Label>
                  <Select
                    value={draft.billingCycle}
                    onValueChange={(v) =>
                      setDraft((prev) => ({ ...prev, billingCycle: v as BillingCycle }))
                    }
                  >
                    <SelectTrigger className="bg-muted/50 focus:bg-background transition-colors h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cycleOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    Billing Day
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={draft.billingDay}
                    onChange={(e) => {
                      setDraft((prev) => ({ ...prev, billingDay: e.target.value }));
                    }}
                    aria-invalid={Boolean(billingDayError ?? errors.billingDay)}
                    className="bg-muted/50 focus-visible:bg-background transition-colors h-10"
                  />
                  {(billingDayError ?? errors.billingDay) && (
                    <p className="text-xs text-destructive font-medium">{billingDayError ?? errors.billingDay}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => setDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="bg-muted/50 focus-visible:bg-background transition-colors h-10"
                />
              </div>
            </div>

            {/* BNPL Settings */}
            {type === "bnpl" && (
              <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground mb-1">
                  Installment Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalInstallments" className="text-xs font-medium text-muted-foreground">
                      Total Installments
                    </Label>
                    <Input
                      id="totalInstallments"
                      type="number"
                      min="1"
                      max="120"
                      value={draft.totalInstallments}
                      onChange={(e) => {
                        setDraft((prev) => ({ ...prev, totalInstallments: e.target.value }));
                        setErrors((prev) => ({ ...prev, totalInstallments: undefined }));
                      }}
                      className="bg-background h-10"
                    />
                    {errors.totalInstallments && (
                      <p className="text-xs text-destructive">{errors.totalInstallments}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="installmentsPaid" className="text-xs font-medium text-muted-foreground">
                      Installments Paid
                    </Label>
                    <Input
                      id="installmentsPaid"
                      type="number"
                      min="0"
                      value={draft.installmentsPaid}
                      onChange={(e) => {
                        setDraft((prev) => ({ ...prev, installmentsPaid: e.target.value }));
                        setErrors((prev) => ({ ...prev, installmentsPaid: undefined }));
                      }}
                      className="bg-background h-10"
                    />
                    {errors.installmentsPaid ? (
                      <p className="text-xs text-destructive">{errors.installmentsPaid}</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        Enter the count, not RM amount.
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 rounded-lg border bg-background p-3 hover:bg-muted/50 transition-colors cursor-pointer select-none">
                    <Checkbox
                      checked={draft.isShariah}
                      onChange={(checked) =>
                        setDraft((prev) => ({
                          ...prev,
                          isShariah: Boolean(checked),
                          interestRate: checked ? "0" : prev.interestRate,
                        }))
                      }
                    />
                    <span className="text-sm font-medium">Shariah-compliant plan</span>
                  </label>
                </div>

                {!draft.isShariah && (
                  <div className="space-y-2 pt-2">
                    <Label
                      htmlFor="interestRate"
                      className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      <Percent className="h-3 w-3" />
                      Interest (%)
                    </Label>
                    <div className="relative">
                      <Input
                        id="interestRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={draft.interestRate}
                        onChange={(e) => {
                          setDraft((prev) => ({ ...prev, interestRate: e.target.value }));
                          setErrors((prev) => ({ ...prev, interestRate: undefined }));
                        }}
                        placeholder="0"
                        className="bg-background pr-8 h-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                        %
                      </span>
                    </div>
                    {errors.interestRate && (
                      <p className="text-xs text-destructive">{errors.interestRate}</p>
                    )}
                  </div>
                )}
                {draft.isShariah && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Interest is automatically set to 0% for Shariah-compliant plans.
                  </p>
                )}
              </div>
            )}

            <Separator className="bg-border/60" />

            {/* Appearance & Notes */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Palette className="h-3 w-3" />
                  Color Label
                </Label>
                <div className="flex flex-wrap gap-3 pt-1">
                  {ITEM_COLORS.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, color: swatch }))}
                      aria-label={`Select ${swatch}`}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-all duration-200 shadow-sm",
                        draft.color === swatch
                          ? "border-foreground scale-110 ring-2 ring-background ring-offset-1"
                          : "border-transparent hover:scale-105 opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="notes" className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  Notes <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
                </Label>
                <Input
                  id="notes"
                  value={draft.notes}
                  onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any additional details..."
                  maxLength={500}
                  className="bg-muted/50 focus-visible:bg-background transition-colors h-10"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-border/60">
            <Button variant="outline" onClick={onClose} className="flex-1 font-medium h-10">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1 font-medium shadow-sm h-10">
              {editItem ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

