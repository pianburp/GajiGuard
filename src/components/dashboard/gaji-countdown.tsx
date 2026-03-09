"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Pencil, X } from "lucide-react";
import { formatRM } from "@/lib/utils/format";

interface GajiCountdownProps {
  gajiDay: number;
  onSetGajiDay: (day: number) => void;
  billsBeforePayday: {
    count: number;
    total: number;
  };
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

const MALAYSIA_EMOJIS = ["🇲🇾", "🕌", "🌴", "🥥", "🌺", "🐯", "🧋", "🍛"];

export function GajiCountdown({ gajiDay, onSetGajiDay, billsBeforePayday }: GajiCountdownProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(gajiDay));
  const inputRef = useRef<HTMLInputElement>(null);
  const [confettiSeed, setConfettiSeed] = useState(0);
  const [randomEmoji, setRandomEmoji] = useState(MALAYSIA_EMOJIS[0]);

  const { daysUntil, periodDays } = useMemo(() => {
    const today = normalizeDate(new Date());
    const currentMonthPayday = normalizeDate(
      buildPayday(today.getFullYear(), today.getMonth(), gajiDay),
    );

    if (currentMonthPayday.getTime() === today.getTime()) {
      const previousPayday = normalizeDate(
        buildPayday(today.getFullYear(), today.getMonth() - 1, gajiDay),
      );
      const cycleDays = Math.max(
        1,
        Math.ceil((currentMonthPayday.getTime() - previousPayday.getTime()) / (1000 * 60 * 60 * 24)),
      );
      return { daysUntil: 0, periodDays: cycleDays };
    }

    const target =
      currentMonthPayday > today
        ? currentMonthPayday
        : normalizeDate(buildPayday(today.getFullYear(), today.getMonth() + 1, gajiDay));

    const previousPayday =
      target.getMonth() === today.getMonth()
        ? normalizeDate(buildPayday(today.getFullYear(), today.getMonth() - 1, gajiDay))
        : currentMonthPayday;
    const cycleDays = Math.max(
      1,
      Math.ceil((target.getTime() - previousPayday.getTime()) / (1000 * 60 * 60 * 24)),
    );

    return {
      daysUntil: Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      periodDays: cycleDays,
    };
  }, [gajiDay]);

  useEffect(() => {
    setRandomEmoji(
      MALAYSIA_EMOJIS[Math.floor(Math.random() * MALAYSIA_EMOJIS.length)]
    );
  }, []);

  useEffect(() => {
    if (daysUntil === 0) {
      setConfettiSeed((seed) => seed + 1);
    }
  }, [daysUntil]);

  const urgency = Math.min(1, Math.max(0, 1 - daysUntil / periodDays));
  const progress = Math.round(urgency * 100);
  const ringColor = urgency < 0.45 ? "#ef4444" : urgency < 0.78 ? "#f59e0b" : "#22c55e";
  const ringTrack = 2 * Math.PI * 34;
  const ringOffset = ringTrack - (progress / 100) * ringTrack;
  const gradientClass =
    urgency < 0.45
      ? "from-red-500/20 to-red-500/5 text-red-700 dark:text-red-300"
      : urgency < 0.78
        ? "from-amber-500/20 to-amber-500/5 text-amber-700 dark:text-amber-300"
        : "from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-300";


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
    <Card className={`relative overflow-hidden border bg-gradient-to-br ${gradientClass}`}>
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
        <div className="mb-2 flex items-center gap-3">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="7"
                fill="none"
                className="text-foreground/10"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="34"
                stroke={ringColor}
                strokeWidth="7"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={ringTrack}
                animate={{ strokeDashoffset: ringOffset }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
              <div>
                <p className="text-lg font-semibold tabular-nums">{daysUntil}</p>
                <p className="text-[10px] leading-tight text-muted-foreground">days</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">
              {daysUntil === 0
                ? `Hari ni gaji day! ${randomEmoji}`
                : `Lagi ${daysUntil} hari lagi ${randomEmoji}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {billsBeforePayday.count > 0
                ? `${billsBeforePayday.count} bills totalling ${formatRM(billsBeforePayday.total)} before gaji`
                : "No unpaid bills before payday"}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Payday set to {gajiDay}hb</p>
      </CardContent>
      <AnimatePresence>
        {daysUntil === 0 && (
          <motion.div
            key={confettiSeed}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 18 }).map((_, index) => (
              <motion.span
                key={`confetti-${confettiSeed}-${index}`}
                className="absolute h-2 w-1.5 rounded-sm"
                style={{
                  left: `${10 + (index % 9) * 10}%`,
                  top: `${6 + Math.floor(index / 9) * 8}%`,
                  backgroundColor: ["#22c55e", "#eab308", "#f97316", "#3b82f6"][index % 4],
                }}
                initial={{ y: -8, opacity: 1, rotate: 0 }}
                animate={{
                  y: 72 + (index % 6) * 8,
                  opacity: 0,
                  rotate: (index % 2 === 0 ? 1 : -1) * (100 + index * 4),
                }}
                transition={{ duration: 1.2, ease: "easeOut", delay: (index % 6) * 0.03 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
