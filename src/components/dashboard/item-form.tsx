"use client";

import { useMemo, useState } from "react";
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
  RECOGNIZED_SUBSCRIPTIONS,
  findRecognizedSubscriptionByName,
  getBrandfetchIconUrl,
} from "@/lib/brandfetch";
import type { BillingCycle, Category, Item, ItemType } from "@/lib/domain/types";
import { CreditCard, Package, Calendar, Tag, FileText, Palette, Store } from "lucide-react";
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
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    totalInstallments: String(editItem?.totalInstallments ?? 6),
    installmentsPaid: String(editItem?.installmentsPaid ?? 0),
  };
}

export function ItemForm({ open, onClose, onSave, editItem }: ItemFormProps) {
  const [draft, setDraft] = useState(() => toDraft(editItem));
  const { type } = draft;

  const cycleOptions = useMemo(() => {
    if (type === "bnpl") return ["weekly", "biweekly", "monthly"] as const;
    return ["weekly", "monthly", "yearly"] as const;
  }, [type]);

  const handleSubmit = () => {
    const parsedAmount = Number(draft.amount);
    const parsedBillingDay = Number(draft.billingDay);
    const parsedTotal = Number(draft.totalInstallments);
    const parsedPaid = Number(draft.installmentsPaid);
    
    if (!draft.name.trim() || parsedAmount <= 0) return;
    if (parsedBillingDay < 1 || parsedBillingDay > 31) return;

    onSave({
      id: editItem?.id ?? makeId(),
      type: draft.type,
      name: draft.name.trim(),
      brandIconUrl:
        draft.type === "subscription" && draft.brandIconUrl
          ? draft.brandIconUrl
          : null,
      amount: parsedAmount,
      currency: "MYR",
      billingCycle: draft.billingCycle,
      billingDay: parsedBillingDay,
      startDate: draft.startDate,
      category: draft.category as Item["category"],
      color: draft.color,
      notes: draft.notes.trim(),
      isActive: true,
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
              setDraft((prev) => ({
                ...prev,
                type: v as ItemType,
                ...(v === "bnpl"
                  ? { recognizedDomain: "", brandIconUrl: "" }
                  : {}),
              }))
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

          <Separator />

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Tag className="h-3 w-3" />
                Name
              </Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => {
                  const nextName = e.target.value;
                  const recognized = findRecognizedSubscriptionByName(nextName);
                  setDraft((prev) => ({
                    ...prev,
                    name: nextName,
                    recognizedDomain: recognized?.domain ?? "",
                    brandIconUrl: recognized ? getBrandfetchIconUrl(recognized.domain) : "",
                  }));
                }}
                placeholder="e.g., Netflix, iPhone Installment"
                maxLength={100}
              />
            </div>

            {type === "subscription" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Store className="h-3 w-3" />
                  Recognized Subscription
                </Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={draft.recognizedDomain || "__none__"}
                    onValueChange={(value) => {
                      if (value === "__none__") {
                        setDraft((prev) => ({
                          ...prev,
                          recognizedDomain: "",
                          brandIconUrl: "",
                        }));
                        return;
                      }
                      const selected = RECOGNIZED_SUBSCRIPTIONS.find(
                        (option) => option.domain === value,
                      );
                      if (!selected) return;
                      setDraft((prev) => ({
                        ...prev,
                        name: selected.name,
                        recognizedDomain: selected.domain,
                        brandIconUrl: getBrandfetchIconUrl(selected.domain),
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a brand to auto-add icon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {RECOGNIZED_SUBSCRIPTIONS.map((subscription) => (
                        <SelectItem key={subscription.domain} value={subscription.domain}>
                          {subscription.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <BrandIcon
                    name={draft.name || "brand"}
                    iconUrl={draft.brandIconUrl}
                    className="h-9 w-9"
                  />
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CreditCard className="h-3 w-3" />
                Amount (RM)
              </Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                max="99999.99"
                step="0.01"
                value={draft.amount}
                onChange={(e) => setDraft((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Billing Cycle & Day */}
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
                  <SelectTrigger>
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
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Billing Day</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={draft.billingDay}
                  onChange={(e) => setDraft((prev) => ({ ...prev, billingDay: e.target.value }))}
                />
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            {/* BNPL Only Fields */}
            {type === "bnpl" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalInstallments" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Installments</Label>
                  <Input
                    id="totalInstallments"
                    type="number"
                    min="1"
                    max="120"
                    value={draft.totalInstallments}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, totalInstallments: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installmentsPaid" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paid So Far</Label>
                  <Input
                    id="installmentsPaid"
                    type="number"
                    min="0"
                    value={draft.installmentsPaid}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, installmentsPaid: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Tag className="h-3 w-3" />
                Category
              </Label>
              <Select
                value={draft.category}
                onValueChange={(v) => setDraft((prev) => ({ ...prev, category: v as Category }))}
              >
                <SelectTrigger>
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

            {/* Color */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Palette className="h-3 w-3" />
                Color
              </Label>
              <div className="flex flex-wrap gap-2">
                {ITEM_COLORS.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, color: swatch }))}
                    aria-label={`Select ${swatch}`}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all duration-150",
                      draft.color === swatch
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <FileText className="h-3 w-3" />
                Notes (optional)
              </Label>
              <Input
                id="notes"
                value={draft.notes}
                onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional details..."
                maxLength={500}
              />
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              {editItem ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
