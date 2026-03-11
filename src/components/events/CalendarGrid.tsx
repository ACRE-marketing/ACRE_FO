import { useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, format, isToday,
} from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  event_type: string;
  is_mandatory?: boolean;
  is_recurring?: boolean;
}

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events: CalendarEvent[];
  rsvpStatuses: Record<string, string>;
}

const typeColors: Record<string, string> = {
  activity: "bg-primary",
  training: "bg-blue-500",
  admin: "bg-amber-500",
};

export default function CalendarGrid({
  currentDate, selectedDate, onSelectDate, events, rsvpStatuses,
}: CalendarGridProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const result: Date[] = [];
    let d = calStart;
    while (d <= calEnd) {
      result.push(d);
      d = addDays(d, 1);
    }
    return result;
  }, [currentDate]);

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.start_time), day));

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 bg-muted">
        {weekDays.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const inMonth = isSameMonth(day, currentDate);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);

          // Categorize events
          const hasRsvpd = dayEvents.some(
            (e) => rsvpStatuses[e.id] === "going" || (e as any).is_mandatory
          );
          const hasPending = dayEvents.some(
            (e) => !rsvpStatuses[e.id] && !(e as any).is_mandatory
          );

          return (
            <button
              key={i}
              onClick={() => onSelectDate(day)}
              className={cn(
                "relative min-h-[72px] p-1.5 border-t border-r border-border text-left transition-colors hover:bg-muted/50",
                !inMonth && "opacity-30",
                selected && "bg-accent/10 ring-1 ring-accent ring-inset",
                today && !selected && "bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                  today && "bg-primary text-primary-foreground",
                  selected && !today && "bg-accent text-accent-foreground",
                )}
              >
                {format(day, "d")}
              </span>

              {/* Event dots */}
              {dayEvents.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => {
                    const isMandatory = (e as any).is_mandatory;
                    const isGoing = rsvpStatuses[e.id] === "going";
                    return (
                      <div
                        key={e.id}
                        className={cn(
                          "text-[10px] leading-tight truncate rounded px-1 py-0.5",
                          isMandatory
                            ? "bg-destructive/10 text-destructive"
                            : isGoing
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-50 text-blue-600",
                        )}
                      >
                        {e.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">
                      +{dayEvents.length - 3} more
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
