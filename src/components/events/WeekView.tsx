import { useMemo } from "react";
import { startOfWeek, addDays, isSameDay, format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Clock, MapPin, Video } from "lucide-react";
import { getCategory, categoryStyles } from "./eventCategory";

interface WeekEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string | null;
  event_type: string;
  is_mandatory?: boolean;
  is_online?: boolean;
  location?: string | null;
}

interface WeekViewProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events: WeekEvent[];
  rsvpStatuses: Record<string, string>;
  onEventClick: (event: WeekEvent) => void;
}

export default function WeekView({
  currentDate, selectedDate, onSelectDate, events, rsvpStatuses, onEventClick,
}: WeekViewProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const getEventsForDay = (day: Date) =>
    events
      .filter((e) => isSameDay(new Date(e.start_time), day))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7">
        {weekDays.map((day) => {
          const dayEvents = getEventsForDay(day);
          const today = isToday(day);
          const selected = isSameDay(day, selectedDate);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[300px] border-r border-border last:border-r-0",
                selected && "bg-accent/5",
              )}
            >
              {/* Day header */}
              <button
                onClick={() => onSelectDate(day)}
                className={cn(
                  "w-full px-2 py-2 text-center border-b border-border hover:bg-muted/50 transition-colors",
                  today && "bg-primary/5",
                )}
              >
                <div className="text-xs text-muted-foreground">
                  {format(day, "EEE")}
                </div>
                <div
                  className={cn(
                    "text-sm font-medium mx-auto w-7 h-7 flex items-center justify-center rounded-full",
                    today && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </div>
              </button>

              {/* Events */}
              <div className="p-1 space-y-1">
                {dayEvents.map((e) => {
                  const isMandatory = (e as any).is_mandatory;
                  const isGoing = rsvpStatuses[e.id] === "going";

                  return (
                    <button
                      key={e.id}
                      onClick={() => onEventClick(e)}
                      className={cn(
                        "w-full text-left rounded p-1.5 text-xs transition-colors",
                        isMandatory
                          ? "bg-destructive/10 hover:bg-destructive/15 border border-destructive/20"
                          : isGoing
                          ? "bg-green-50 hover:bg-green-100 border border-green-200"
                          : "bg-muted hover:bg-muted/80 border border-border",
                      )}
                    >
                      <div className="font-medium truncate">{e.title}</div>
                      <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                        <Clock className="w-3 h-3 shrink-0" />
                        {format(new Date(e.start_time), "h:mm a")}
                      </div>
                      {e.is_online && (
                        <div className="flex items-center gap-1 mt-0.5 text-blue-600">
                          <Video className="w-3 h-3 shrink-0" />
                          <span>Online</span>
                        </div>
                      )}
                      {!e.is_online && e.location && (
                        <div className="flex items-center gap-1 mt-0.5 text-muted-foreground truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{e.location}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
