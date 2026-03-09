"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRM } from "@/lib/utils/format";
import type { CancelSuggestion } from "@/domain/insights";

interface SmartCancelSuggestionsProps {
  suggestions: CancelSuggestion[];
}

export function SmartCancelSuggestions({ suggestions }: SmartCancelSuggestionsProps) {
  return (
    <Card className="border h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Belanja dengan Bijak</CardTitle>
        <CardDescription className="text-xs">
          Subscriptions that are potentially unused based on payment patterns.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No cancel suggestions at the moment. Payment patterns look consistent.
          </p>
        ) : (
          <div className="space-y-2.5">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.itemId}
                className="rounded-md border bg-muted/40 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{suggestion.itemName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Unused for {suggestion.consecutiveMissedMonths} months - save{" "}
                      <span className="font-semibold text-foreground">
                        {formatRM(suggestion.annualSavings)}
                      </span>{" "}
                      if canceled
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Cancel Candidate
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

