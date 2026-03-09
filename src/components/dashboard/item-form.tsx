"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { CATEGORY_OPTIONS, ITEM_COLORS } from "@/lib/config/constants";
import { toLocalDateKey } from "@/lib/utils/date";
import {
  findRecognizedSubscriptionByName,
  getBrandfetchIconUrl,
  type RecognizedSubscription,
} from "@/domain/brandfetch";
import type { BillingCycle, Category, Item, ItemType } from "@/domain/types";
import { searchSubscriptions, suggestCategory } from "@/actions";
import { Checkbox } from "@/components/animate-ui/components/headless/checkbox";
import {
  Calendar as CalendarIcon,
  CreditCard,
  FileText,
  Package,
  Percent,
  Tag,
  Hash,
  CalendarDays,
  LayoutGrid,
  MoonStar
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BrandIcon } from "@/components/dashboard/brand-icon";
import { format } from "date-fns";

interface ItemFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: Item) => void;
  editItem: Item | null;
  prefill?: Partial<ItemDraft>;
}

function todayDate(): string {
  return toLocalDateKey(new Date());
}

function fromDateKey(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const parsed = new Date(y, m - 1, d);
  return toLocalDateKey(parsed) === value ? parsed : undefined;
}

function makeId(): string {
  return crypto.randomUUID();
}

function pickAutoColor(name: string, category: Category): string {
  const seed = (name.trim().toLowerCase() || category).trim();
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return ITEM_COLORS[Math.abs(hash) % ITEM_COLORS.length] ?? ITEM_COLORS[0];
}

export type ItemDraft = {
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

function toDraft(editItem: Item | null, prefill?: Partial<ItemDraft>): ItemDraft {
  if (editItem) {
    const recognized = findRecognizedSubscriptionByName(editItem.name);
    return {
      type: editItem.type,
      name: editItem.name,
      brandIconUrl:
        editItem.brandIconUrl ??
        (recognized ? getBrandfetchIconUrl(recognized.domain) : ""),
      recognizedDomain: recognized?.domain ?? "",
      amount: String(editItem.amount),
      billingCycle: editItem.billingCycle,
      billingDay: String(editItem.billingDay),
      startDate: editItem.startDate,
      category: editItem.category,
      color: editItem.color,
      notes: editItem.notes,
      isShariah: editItem.isShariah,
      interestRate: String(editItem.interestRate ?? 0),
      totalInstallments: String(editItem.totalInstallments ?? 6),
      installmentsPaid: String(editItem.installmentsPaid ?? 0),
    };
  }

  const seedName = prefill?.name ?? "";
  const seedType = prefill?.type ?? "subscription";
  const recognized = findRecognizedSubscriptionByName(seedName);
  const defaults: ItemDraft = {
    type: seedType,
    name: seedName,
    brandIconUrl: recognized ? getBrandfetchIconUrl(recognized.domain) : "",
    recognizedDomain: recognized?.domain ?? "",
    amount: "",
    billingCycle: "monthly",
    billingDay: "1",
    startDate: todayDate(),
    category: "other",
    color: ITEM_COLORS[0],
    notes: "",
    isShariah: false,
    interestRate: "0",
    totalInstallments: "6",
    installmentsPaid: "0",
  };

  return {
    ...defaults,
    ...prefill,
  };
}

export function ItemForm({ open, onClose, onSave, editItem, prefill }: ItemFormProps) {
  const [draft, setDraft] = useState(() => toDraft(editItem, prefill));
  const [errors, setErrors] = useState<{
    billingDay?: string;
    startDate?: string;
    totalInstallments?: string;
    installmentsPaid?: string;
    interestRate?: string;
  }>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<RecognizedSubscription[]>([]);
  const [, startSearchTransition] = useTransition();
  const [, startCategoryTransition] = useTransition();
  const latestSearchIdRef = useRef(0);
  const latestCategoryIdRef = useRef(0);
  const nameWrapperRef = useRef<HTMLDivElement>(null);
  const { type } = draft;
  const trimmedName = draft.name.trim();
  const isEditing = Boolean(editItem);

  useEffect(() => {
    if (!open) return;
    setDraft(toDraft(editItem, prefill));
    setNameSuggestions([]);
    setErrors({});
  }, [editItem, open, prefill]);

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

  useEffect(() => {
    if (!open) return;
    if (!showSuggestions || !trimmedName) {
      setNameSuggestions([]);
      return;
    }

    const searchId = latestSearchIdRef.current + 1;
    latestSearchIdRef.current = searchId;
    const timer = window.setTimeout(() => {
      startSearchTransition(() => {
        void searchSubscriptions(trimmedName, type)
          .then((results) => {
            if (latestSearchIdRef.current !== searchId) return;
            setNameSuggestions(results);
          })
          .catch(() => {
            if (latestSearchIdRef.current !== searchId) return;
            setNameSuggestions([]);
          });
      });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [open, showSuggestions, trimmedName, type, startSearchTransition]);

  useEffect(() => {
    if (!open) return;
    const name = draft.name.trim();
    const itemType = draft.type;
    if (!name) {
      setDraft((prev) => (prev.category === "other" ? prev : { ...prev, category: "other" }));
      return;
    }

    const categoryId = latestCategoryIdRef.current + 1;
    latestCategoryIdRef.current = categoryId;
    const timer = window.setTimeout(() => {
      startCategoryTransition(() => {
        void suggestCategory(name, itemType)
          .then((category) => {
            if (latestCategoryIdRef.current !== categoryId) return;
            setDraft((prev) => {
              if (prev.name.trim() !== name || prev.type !== itemType) return prev;
              return { ...prev, category };
            });
          })
          .catch(() => undefined);
      });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [open, draft.name, draft.type, startCategoryTransition]);

  const billingDayError = useMemo(() => {
    const value = draft.billingDay.trim();
    if (!value) return "Payment day is required.";
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31)
      return "Payment day must be a whole number between 1 and 31.";
    return undefined;
  }, [draft.billingDay]);

  const startDateError = useMemo(() => {
    const value = draft.startDate.trim();
    if (!value) return "Start date is required.";
    if (value > todayDate()) return "Start date cannot be in the future.";
    return undefined;
  }, [draft.startDate]);

  const startDateValue = useMemo(
    () => fromDateKey(draft.startDate),
    [draft.startDate],
  );

  const perInstallmentAmount = useMemo(() => {
    if (type !== "bnpl") return null;
    const parsedAmount = Number(draft.amount);
    const parsedTotal = Number(draft.totalInstallments);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;
    if (!Number.isInteger(parsedTotal) || parsedTotal < 1) return null;
    return parsedAmount / parsedTotal;
  }, [type, draft.amount, draft.totalInstallments]);

  const perInstallmentAmountLabel = useMemo(() => {
    if (perInstallmentAmount === null) return null;
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(perInstallmentAmount);
  }, [perInstallmentAmount]);

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
      nextErrors.billingDay = "Payment day must be a whole number between 1 and 31.";
    }
    if (startDateError) {
      nextErrors.startDate = startDateError;
    }
    if (draft.type === "bnpl") {
      if (!Number.isInteger(parsedTotal) || parsedTotal < 1) {
        nextErrors.totalInstallments =
          "Total installments must be a whole number of at least 1.";
      }
      if (isEditing && (!Number.isInteger(parsedPaid) || parsedPaid < 0)) {
        nextErrors.installmentsPaid =
          "Installments paid must be a whole number of at least 0.";
      }
      if (
        isEditing &&
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
      color: editItem?.color ?? pickAutoColor(draft.name, draft.category),
      notes: draft.notes.trim(),
      isActive: true,
      isShariah: draft.type === "bnpl" ? draft.isShariah : false,
      interestRate:
        draft.type === "bnpl" && !draft.isShariah ? parsedInterestRate : 0,
      totalInstallments: draft.type === "bnpl" ? parsedTotal : null,
      installmentsPaid: draft.type === "bnpl" ? (isEditing ? parsedPaid : 0) : 0,
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
                  <p className="mt-1 text-[10px] text-muted-foreground">Brand preview</p>
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <LayoutGrid className="h-3 w-3" />
                    Category
                  </Label>
                  <Select
                    value={draft.category}
                    onValueChange={(v) => setDraft((prev) => ({ ...prev, category: v as Category }))}
                  >
                    <SelectTrigger className="h-10 w-full bg-muted/50 transition-colors focus:bg-background">
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
                <div className="min-w-0 space-y-2">
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
                  </div>
                  {type === "bnpl" && (
                    <p className="text-[10px] text-muted-foreground leading-tight">Total purchase amount</p>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-border/60" />

            {/* Billing Information */}
            <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground">Billing</h4>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="min-w-0 space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <CalendarIcon className="h-3 w-3" />
                    Billing Cycle
                  </Label>
                  <Select
                    value={draft.billingCycle}
                    onValueChange={(v) =>
                      setDraft((prev) => ({ ...prev, billingCycle: v as BillingCycle }))
                    }
                  >
                    <SelectTrigger className="h-10 w-full bg-muted/50 transition-colors focus:bg-background">
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
                <div className="min-w-0 space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    Payment Day
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
                <div className="min-w-0 space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    Start Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        aria-invalid={Boolean(startDateError ?? errors.startDate)}
                        className={cn(
                          "h-10 w-full justify-start bg-muted/50 text-left font-normal hover:bg-background",
                          "overflow-hidden text-ellipsis whitespace-nowrap",
                          !startDateValue && "text-muted-foreground",
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {startDateValue ? format(startDateValue, "dd/MM/yyyy") : "Pick a start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DateCalendar
                        mode="single"
                        selected={startDateValue}
                        onSelect={(date) => {
                          if (!date) return;
                          setDraft((prev) => ({ ...prev, startDate: toLocalDateKey(date) }));
                          setErrors((prev) => ({ ...prev, startDate: undefined }));
                        }}
                        disabled={(date) => toLocalDateKey(date) > todayDate()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {(startDateError ?? errors.startDate) && (
                    <p className="text-xs text-destructive font-medium">{startDateError ?? errors.startDate}</p>
                  )}
                </div>
              </div>
            </div>

            {/* BNPL Settings */}
            {type === "bnpl" && (
              <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground mb-1">
                  Installment Details
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[3, 6, 12].map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => {
                            setDraft((prev) => ({ ...prev, totalInstallments: String(preset) }));
                            setErrors((prev) => ({ ...prev, totalInstallments: undefined }));
                          }}
                        >
                          {preset} mo
                        </Button>
                      ))}
                    </div>
                    {errors.totalInstallments && (
                      <p className="text-xs text-destructive">{errors.totalInstallments}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Plan Type</Label>
                    <label className="flex h-10 items-center gap-3 rounded-lg border bg-background px-3 hover:bg-muted/50 transition-colors cursor-pointer select-none">
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
                      <MoonStar className="h-3 w-3 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-600">Shariah-compliant</span>
                    </label>
                  </div>
                </div>

                {isEditing && (
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
                )}

                {perInstallmentAmountLabel && (
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Per-installment payment</p>
                    <p className="text-base font-semibold text-foreground">{perInstallmentAmountLabel}</p>
                  </div>
                )}

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
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Applied to the financed purchase amount.
                    </p>
                  </div>
                )}
                {draft.isShariah && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Interest is automatically set to 0% for Shariah-compliant.
                  </p>
                )}
              </div>
            )}

            <Separator className="bg-border/60" />

            {/* Notes */}
            <div className="space-y-4">
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

