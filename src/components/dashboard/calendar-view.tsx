"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toLocalDateKey } from "@/lib/date";
import type { Item, Occurrence } from "@/lib/domain/types";
import { BrandIcon } from "@/components/dashboard/brand-icon";
import { Button } from "@/components/ui/button";

interface CalendarViewProps {
  monthDate: Date;
  selectedDate: string | null;
  occurrences: Occurrence[];
  itemsById: Record<string, Item>;
  onSelectDate: (date: string) => void;
  onMonthChange?: (date: Date) => void;
}

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function CalendarView({
  monthDate,
  selectedDate,
  occurrences,
  itemsById,
  onSelectDate,
  onMonthChange,
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
    
    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonth.getDate() - i);
      cells.push({ date, dateKey: toLocalDateKey(date), inMonth: false });
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      cells.push({ date, dateKey: toLocalDateKey(date), inMonth: true });
    }
    
    // Next month padding (fill to 6 rows = 42 cells)
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
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
      {/* Header - Apple Calendar Style */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTodayClick}
            className="text-[#ff3b30] hover:text-[#ff3b30]/80 hover:bg-[#ff3b30]/5 font-medium text-sm"
          >
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <h2 className="text-lg font-semibold text-gray-900">
          {monthLabel} <span className="font-normal text-gray-500">{yearLabel}</span>
        </h2>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-white">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={cn(
              "py-2 text-center text-[11px] font-medium uppercase tracking-wide",
              index === 0 || index === 6 ? "text-gray-400" : "text-gray-500"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {cells.map(({ date, dateKey, inMonth }, index) => {
          const dayItems = occurrenceMap.get(dateKey) ?? [];
          const isToday = dateKey === today;
          const isSelected = dateKey === selectedDate;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const row = Math.floor(index / 7);
          const col = index % 7;
          
          // Check if in first/last row or column for border radius
          const isFirstRow = row === 0;
          const isLastRow = row === 5;
          const isFirstCol = col === 0;
          const isLastCol = col === 6;

          return (
            <button
              key={dateKey}
              onClick={() => handleDateClick(dateKey)}
              className={cn(
                "relative flex flex-col items-start p-1.5 text-left transition-all duration-150",
                "border-r border-b border-gray-100",
                "hover:bg-gray-50",
                !inMonth && "bg-gray-50/50",
                isLastCol && "border-r-0",
                isLastRow && "border-b-0",
                isSelected && "bg-[#fff5f5] hover:bg-[#fff0f0]",
                // Subtle rounded corners for the grid edges
                isFirstRow && isFirstCol && "rounded-tl-xl",
                isFirstRow && isLastCol && "rounded-tr-xl",
                isLastRow && isFirstCol && "rounded-bl-xl",
                isLastRow && isLastCol && "rounded-br-xl"
              )}
            >
              {/* Date Number */}
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center text-[13px] font-normal",
                  !inMonth && "text-gray-300",
                  inMonth && isWeekend && !isToday && "text-gray-500",
                  inMonth && !isWeekend && !isToday && "text-gray-900",
                  isToday && "rounded-full bg-[#ff3b30] font-medium text-white shadow-sm",
                  isSelected && !isToday && inMonth && "text-gray-900"
                )}
              >
                {date.getDate()}
              </span>

              {/* Events / Indicators */}
              {dayItems.length > 0 && (
                <div className="mt-auto w-full space-y-[2px]">
                  {dayItems.slice(0, 3).map((occurrence, idx) => {
                    const item = itemsById[occurrence.itemId];
                    const isPaid = occurrence.status === "paid";
                    const isMissed = occurrence.status === "missed";
                    const showBrandIcon = !isPaid && !isMissed && Boolean(item?.brandIconUrl);

                    if (showBrandIcon) {
                      return (
                        <div
                          key={`${occurrence.itemId}-${idx}`}
                          className="flex items-center gap-1.5 py-[1px]"
                        >
                          <BrandIcon
                            name={item?.name ?? "Brand"}
                            iconUrl={item?.brandIconUrl}
                            className="h-3.5 w-3.5 rounded-[2px] flex-shrink-0"
                          />
                          <span className="text-[10px] text-gray-600 truncate leading-tight">
                            {item?.name}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`${occurrence.itemId}-${idx}`}
                        className="flex items-center gap-1.5 py-[1px]"
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full flex-shrink-0",
                            isPaid && "bg-gray-300",
                            isMissed && "bg-[#ff3b30]/70",
                            !isPaid && !isMissed && "bg-gray-400"
                          )}
                          style={{
                            backgroundColor: !isPaid && !isMissed ? item?.color : undefined,
                          }}
                        />
                        <span className="text-[10px] text-gray-600 truncate leading-tight">
                          {item?.name}
                        </span>
                      </div>
                    );
                  })}
                  {dayItems.length > 3 && (
                    <div className="flex items-center gap-1 py-[1px]">
                      <span className="h-1 w-1 rounded-full bg-gray-300" />
                      <span className="text-[9px] text-gray-400">
                        +{dayItems.length - 3} more
                      </span>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
