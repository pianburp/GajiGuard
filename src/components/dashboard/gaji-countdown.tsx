"use client";

import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Pencil, X } from "lucide-react";

interface GajiCountdownProps {
  gajiDay: number;
  onSetGajiDay: (day: number) => void;
}

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function buildPayday(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

export function GajiCountdown({ gajiDay, onSetGajiDay }: GajiCountdownProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(gajiDay));
  const inputRef = useRef<HTMLInputElement>(null);

  const daysUntil = useMemo(() => {
    const today = normalizeDate(new Date());
    const currentMonthPayday = normalizeDate(
      buildPayday(today.getFullYear(), today.getMonth(), gajiDay),
    );

    if (currentMonthPayday.getTime() === today.getTime()) {
      return 0;
    }

    const target =
      currentMonthPayday > today
        ? currentMonthPayday
        : normalizeDate(buildPayday(today.getFullYear(), today.getMonth() + 1, gajiDay));

    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [gajiDay]);

  const startEditing = () => {
    setDraft(String(gajiDay));
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commit = () => {
    const parsed = Number(draft);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 31) {
      onSetGajiDay(parsed);
      setEditing(false);
      return;
    }
    setDraft(String(gajiDay));
    setEditing(false);
  };

  return (
    <Card className="border bg-muted/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Gaji Countdown</CardTitle>
          {editing ? (
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                type="number"
                min={1}
                max={31}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commit();
                  if (event.key === "Escape") setEditing(false);
                }}
                className="h-7 w-14 text-xs"
              />
              <Button size="icon-sm" variant="ghost" onClick={commit}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={startEditing}
              className="h-6 w-6"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm font-medium">
          {daysUntil === 0
            ? "🎉 Hari ni gaji day!"
            : `💰 ${daysUntil} hari lagi before gaji!`}
        </p>
        <p className="text-xs text-muted-foreground">Payday set to {gajiDay}hb</p>
      </CardContent>
    </Card>
  );
}
