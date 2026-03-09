"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toLocalDateKey } from "@/lib/utils/date";
import type { Item, Occurrence } from "@/domain/types";
import { BrandIcon } from "@/components/dashboard/brand-icon";
import { Button } from "@/components/ui/button";

interface CalendarViewProps {
  monthDate: Date;
  selectedDate: string | null;
  occurrences: Occurrence[];
  itemsById: Record<string, Item>;
  onSelectDate: (date: string) => void;
  onMonthChange?: (date: Date) => void;
  onMarkPaid?: (itemId: string, date: string) => void;
}

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarView({
  monthDate,
  selectedDate,
  occurrences,
  itemsById,
  onSelectDate,
  onMonthChange,
  onMarkPaid,
}: CalendarViewProps) {
  const { cells, monthLabel, yearLabel } = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const cells: Array<{
      date: Date;
      dateKey: string;
      inMonth: boolean;
    }> = [];

    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(
        prevMonth.getFullYear(),
        prevMonth.getMonth(),
        prevMonth.getDate() - i,
      );
      cells.push({ date, dateKey: toLocalDateKey(date), inMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      cells.push({ date, dateKey: toLocalDateKey(date), inMonth: true });
    }

    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      cells.push({ date, dateKey: toLocalDateKey(date), inMonth: false });
    }

    return {
      cells,
      monthLabel: months[month],
      yearLabel: year.toString(),
    };
  }, [monthDate]);

  const occurrenceMap = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const occurrence of occurrences) {
      const list = map.get(occurrence.date) ?? [];
      list.push(occurrence);
      map.set(occurrence.date, list);
    }
    return map;
  }, [occurrences]);

  const today = useMemo(() => toLocalDateKey(new Date()), []);

  const handlePrevMonth = () => {
    const prev = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
    onMonthChange?.(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    onMonthChange?.(next);
  };

  const handleDateClick = (dateKey: string) => {
    onSelectDate(dateKey);
  };

  const handleTodayClick = () => {
    const now = new Date();
    onMonthChange?.(now);
    const todayKey = toLocalDateKey(now);
    onSelectDate(todayKey);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-200/60 dark:border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTodayClick}
            className="text-[#ff3b30] hover:text-[#ff3b30]/80 hover:bg-[#ff3b30]/5 dark:hover:bg-[#ff3b30]/15 font-medium text-sm"
          >
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-7 w-7 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-7 w-7 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
          {monthLabel}{" "}
          <span className="font-normal text-gray-500 dark:text-zinc-400">
            {yearLabel}
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-[#1c1c1e]">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={cn(
              "py-2 text-center text-[11px] font-medium uppercase tracking-wide",
              index === 0 || index === 6
                ? "text-gray-400 dark:text-zinc-500"
                : "text-gray-500 dark:text-zinc-400",
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {cells.map(({ date, dateKey, inMonth }, index) => {
          const dayItems = occurrenceMap.get(dateKey) ?? [];
          const isToday = dateKey === today;
          const isSelected = dateKey === selectedDate;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const row = Math.floor(index / 7);
          const col = index % 7;

          const isFirstRow = row === 0;
          const isLastRow = row === 5;
          const isFirstCol = col === 0;
          const isLastCol = col === 6;

          return (
            <div
              key={dateKey}
              role="button"
              tabIndex={0}
              onClick={() => handleDateClick(dateKey)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleDateClick(dateKey);
                }
              }}
              className={cn(
                "relative flex flex-col items-start p-1.5 text-left transition-all duration-150 cursor-pointer",
                "border-r border-b border-gray-100 dark:border-white/10",
                "hover:bg-gray-50 dark:hover:bg-white/5",
                !inMonth && "bg-gray-50/50 dark:bg-white/[0.03]",
                isLastCol && "border-r-0",
                isLastRow && "border-b-0",
                isSelected &&
                "bg-[#fff5f5] hover:bg-[#fff0f0] dark:bg-[#3a1c1a] dark:hover:bg-[#4a2321]",
                isFirstRow && isFirstCol && "rounded-tl-xl",
                isFirstRow && isLastCol && "rounded-tr-xl",
                isLastRow && isFirstCol && "rounded-bl-xl",
                isLastRow && isLastCol && "rounded-br-xl",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center text-[13px] font-normal",
                  !inMonth && "text-gray-300 dark:text-zinc-600",
                  inMonth && isWeekend && !isToday && "text-gray-500 dark:text-zinc-400",
                  inMonth && !isWeekend && !isToday && "text-gray-900 dark:text-zinc-100",
                  isToday &&
                  "rounded-full bg-[#ff3b30] font-medium text-white shadow-sm shadow-[#ff3b30]/30",
                  isSelected && !isToday && inMonth && "text-gray-900 dark:text-zinc-100",
                )}
              >
                {date.getDate()}
              </span>

              {dayItems.length > 0 && (
                <div className="mt-auto w-full space-y-[2px]">
                  {dayItems.slice(0, 3).map((occurrence, idx) => {
                    const item = itemsById[occurrence.itemId];
                    const isPaid = occurrence.status === "paid";
                    const isMissed = occurrence.status === "missed";
                    const showBrandIcon = !isPaid && !isMissed && Boolean(item?.brandIconUrl);
                    const canMarkPaid = !isPaid && Boolean(onMarkPaid);

                    if (showBrandIcon) {
                      return (
                        <div
                          key={`${occurrence.itemId}-${idx}`}
                          className={cn("group/occ flex items-center gap-1.5 py-[1px]", isPaid && "opacity-55")}
                        >
                          <BrandIcon
                            name={item?.name ?? "Brand"}
                            iconUrl={item?.brandIconUrl}
                            className="h-3.5 w-3.5 rounded-[2px] flex-shrink-0"
                          />
                          <span className="text-[10px] text-gray-600 dark:text-zinc-300 truncate leading-tight">
                            {item?.name}
                          </span>
                          {canMarkPaid && (
                            <button
                              type="button"
                              aria-label="Mark as paid"
                              className="ml-auto inline-flex h-4 w-4 items-center justify-center rounded-sm border border-transparent text-green-600 opacity-0 transition-opacity hover:border-green-500/30 hover:bg-green-500/10 group-hover/occ:opacity-100"
                              onClick={(event) => {
                                event.stopPropagation();
                                onMarkPaid?.(occurrence.itemId, occurrence.date);
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`${occurrence.itemId}-${idx}`}
                        className={cn("group/occ flex items-center gap-1.5 py-[1px]", isPaid && "opacity-55")}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full flex-shrink-0",
                            isPaid && "bg-gray-300 dark:bg-zinc-600",
                            isMissed && "bg-[#ff3b30]/70",
                            !isPaid && !isMissed && "bg-gray-400 dark:bg-zinc-500",
                          )}
                          style={{
                            backgroundColor: !isPaid && !isMissed ? item?.color : undefined,
                          }}
                        />
                        <span className="text-[10px] text-gray-600 dark:text-zinc-300 truncate leading-tight">
                          {item?.name}
                        </span>
                        {canMarkPaid && (
                          <button
                            type="button"
                            aria-label="Mark as paid"
                            className="ml-auto inline-flex h-4 w-4 items-center justify-center rounded-sm border border-transparent text-green-600 opacity-0 transition-opacity hover:border-green-500/30 hover:bg-green-500/10 group-hover/occ:opacity-100"
                            onClick={(event) => {
                              event.stopPropagation();
                              onMarkPaid?.(occurrence.itemId, occurrence.date);
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {dayItems.length > 3 && (
                    <div className="flex items-center gap-1 py-[1px]">
                      <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-zinc-600" />
                      <span className="text-[9px] text-gray-400 dark:text-zinc-500">
                        +{dayItems.length - 3} more
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
