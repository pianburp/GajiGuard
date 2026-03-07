"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ItemDraft } from "@/components/dashboard/item-form";
import { BrandIcon } from "@/components/dashboard/brand-icon";
import {
  RECOGNIZED_SUBSCRIPTIONS,
  BNPL_SUBSCRIPTIONS,
  getBrandfetchIconUrl,
} from "@/lib/domain/brandfetch";

interface EmptyStateProps {
  onQuickAdd: (template: Partial<ItemDraft>) => void;
}

const QUICK_ADD_TEMPLATES: Array<{
  label: string;
  template: Partial<ItemDraft>;
  iconName?: string;
}> = [
  {
    label: "Spotify",
    iconName: "Spotify",
    template: {
      type: "subscription",
      name: "Spotify",
      amount: "15.90",
      billingCycle: "monthly",
      category: "entertainment",
    },
  },
  {
    label: "Netflix",
    iconName: "Netflix",
    template: {
      type: "subscription",
      name: "Netflix",
      amount: "55.00",
      billingCycle: "monthly",
      category: "entertainment",
    },
  },
  {
    label: "YouTube Premium",
    iconName: "YouTube Music",
    template: {
      type: "subscription",
      name: "YouTube Premium",
      amount: "17.90",
      billingCycle: "monthly",
      category: "entertainment",
    },
  },
  {
    label: "Shopee PayLater",
    iconName: "SPayLater",
    template: {
      type: "bnpl",
      name: "Shopee PayLater",
      amount: "300.00",
      billingCycle: "monthly",
      totalInstallments: "3",
      category: "shopping",
    },
  },
];

export function EmptyState({ onQuickAdd }: EmptyStateProps) {
  const templatesWithIcon = QUICK_ADD_TEMPLATES.map((entry) => {
    const source =
      entry.template.type === "bnpl" ? BNPL_SUBSCRIPTIONS : RECOGNIZED_SUBSCRIPTIONS;
    const match = source.find(
      (subscription) => subscription.name === (entry.iconName ?? entry.template.name),
    );
    return {
      ...entry,
      iconUrl: match ? getBrandfetchIconUrl(match.domain) : null,
    };
  });

  return (
    <Card className="border-dashed">
      <CardHeader className="flex flex-col items-center">
        <CardTitle className="text-base">{"Start check subs dulu! \u{1F680}"}</CardTitle>
        <CardDescription>
          Pick a quick template to start in seconds, or add your own item manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {templatesWithIcon.map((entry) => (
            <Button
              key={entry.label}
              type="button"
              variant="outline"
              className="h-9 justify-start gap-2 text-xs"
              onClick={() => onQuickAdd(entry.template)}
            >
              <BrandIcon
                name={entry.template.name ?? entry.label}
                iconUrl={entry.iconUrl}
                className="h-4 w-4 rounded-[3px]"
              />
              {entry.label}
            </Button>
          ))}
        </div>
        {/* hero images now below buttons in a 3‑column row */}
        <div className="grid grid-cols-3 gap-4 mt-6 justify-items-center">
          {['/hero.svg', '/hero2.svg', '/hero3.svg'].map((src, idx) => (
            <img
              key={idx}
              src={src}
              alt={`Hero illustration ${idx + 1}`}
              className="w-auto select-none"
              style={{ height: '360px' }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

