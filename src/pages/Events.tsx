import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, subMonths, addWeeks, subWeeks, format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from "date-fns";
import { toast } from "sonner";
import CalendarGrid from "@/components/events/CalendarGrid";
import WeekView from "@/components/events/WeekView";
import EventDetailPanel from "@/components/events/EventDetailPanel";
import CreateEventDialog from "@/components/events/CreateEventDialog";
import { generateRecurringInstances, type RecurringTemplate } from "@/components/events/recurringEvents";

function generateICS(event: any): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = fmt(new Date(event.start_time));
  const end = event.end_time ? fmt(new Date(event.end_time)) : fmt(new Date(new Date(event.start_time).getTime() + 3600000));
  const loc = event.is_online && event.meeting_link ? event.meeting_link : event.location || "";
  const desc = [event.description, event.is_online && event.meeting_link ? `Join: ${event.meeting_link}` : ""].filter(Boolean).join("\\n");
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//ACRE//Events//EN","BEGIN:VEVENT",
    `DTSTART:${start}`,`DTEND:${end}`,`SUMMARY:${event.title}`,`DESCRIPTION:${desc}`,
    `LOCATION:${loc}`,"STATUS:CONFIRMED",`UID:${event.id}@acre.lovable.app`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
}

function downloadICS(event: any) {
  const blob = new Blob([generateICS(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Calendar invite downloaded");
}

export default function Events() {
  const { user, isPM } = useAuth();
  const qc = useQueryClient();
  const [view, setView] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Fetch events
  const { data: dbEvents = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").order("start_time", { ascending: true });
      return data ?? [];
    },
  });

  // Fetch RSVPs
  const { data: rsvps = [] } = useQuery({
    queryKey: ["my-rsvps", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("event_rsvps").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: allRsvps = [] } = useQuery({
    queryKey: ["all-rsvps"],
    queryFn: async () => {
      const { data } = await supabase.from("event_rsvps").select("*, profiles(name)");
      return data ?? [];
    },
  });

  // Generate recurring instances
  const allEvents = useMemo(() => {
    const rangeStart = startOfWeek(startOfMonth(addMonths(currentDate, -1)));
    const rangeEnd = endOfWeek(endOfMonth(addMonths(currentDate, 1)));

    const recurringTemplates = dbEvents.filter((e: any) => e.is_recurring);
    const regularEvents = dbEvents.filter((e: any) => !e.is_recurring);

    const generatedInstances = recurringTemplates.flatMap((t: any) =>
      generateRecurringInstances(t as RecurringTemplate, rangeStart, rangeEnd)
    );

    return [...regularEvents, ...generatedInstances];
  }, [dbEvents, currentDate]);

  // RSVP status map
  const rsvpStatuses = useMemo(() => {
    const map: Record<string, string> = {};
    rsvps.forEach((r: any) => { map[r.event_id] = r.status; });
    return map;
  }, [rsvps]);

  // RSVP mutation
  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
      const { error } = await supabase.from("event_rsvps").upsert({
        event_id: eventId, user_id: user!.id, status,
      } as any, { onConflict: "event_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-rsvps"] });
      qc.invalidateQueries({ queryKey: ["all-rsvps"] });
      toast.success("RSVP updated");
    },
  });

  // Navigation
  const navigate = (dir: number) => {
    if (view === "month") setCurrentDate((d) => (dir > 0 ? addMonths(d, 1) : subMonths(d, 1)));
    else setCurrentDate((d) => (dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1)));
  };

  // Events for selected date
  const selectedDateEvents = useMemo(() =>
    allEvents.filter((e: any) => isSameDay(new Date(e.start_time), selectedDate)),
    [allEvents, selectedDate]
  );

  // Categorize
  const mandatoryEvents = selectedDateEvents.filter((e: any) => e.is_mandatory);
  const registeredEvents = selectedDateEvents.filter((e: any) => !e.is_mandatory && rsvpStatuses[e.id] === "going");
  const pendingEvents = selectedDateEvents.filter((e: any) => !e.is_mandatory && rsvpStatuses[e.id] !== "going");

  const getGoingCount = (eventId: string) =>
    allRsvps.filter((r: any) => r.event_id === eventId && r.status === "going").length;

  const getGoingNames = (eventId: string) =>
    allRsvps
      .filter((r: any) => r.event_id === eventId && r.status === "going")
      .map((r: any) => (r as any).profiles?.name || "Unknown");

  const handleEventClick = useCallback((event: any) => {
    setSelectedEvent(event);
    setSelectedDate(new Date(event.start_time));
  }, []);

  const headerLabel = view === "month"
    ? format(currentDate, "MMMM yyyy")
    : `${format(startOfWeek(currentDate), "MMM d")} – ${format(addDays(startOfWeek(currentDate), 6), "MMM d, yyyy")}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Events</h1>
        <div className="flex items-center gap-3">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="month" className="text-xs px-3">Month</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-3">Week</TabsTrigger>
            </TabsList>
          </Tabs>
          {isPM && <CreateEventDialog />}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold">{headerLabel}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }} className="text-xs">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Calendar */}
          <div className="lg:col-span-2">
            {view === "month" ? (
              <CalendarGrid
                currentDate={currentDate}
                selectedDate={selectedDate}
                onSelectDate={(d) => { setSelectedDate(d); setSelectedEvent(null); }}
                events={allEvents}
                rsvpStatuses={rsvpStatuses}
              />
            ) : (
              <WeekView
                currentDate={currentDate}
                selectedDate={selectedDate}
                onSelectDate={(d) => { setSelectedDate(d); setSelectedEvent(null); }}
                events={allEvents}
                rsvpStatuses={rsvpStatuses}
                onEventClick={handleEventClick}
              />
            )}
          </div>

          {/* Side panel: selected date events or event detail */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {format(selectedDate, "EEEE, MMM d")}
            </h3>

            {selectedEvent ? (
              <div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)} className="mb-2 text-xs">
                  ← Back to list
                </Button>
                <EventDetailPanel
                  event={selectedEvent}
                  myRsvpStatus={rsvpStatuses[selectedEvent.id] ?? null}
                  goingCount={getGoingCount(selectedEvent.id)}
                  goingNames={getGoingNames(selectedEvent.id)}
                  onRsvp={(status) => rsvpMutation.mutate({ eventId: selectedEvent.id, status })}
                  onDownloadICS={() => downloadICS(selectedEvent)}
                  rsvpLoading={rsvpMutation.isPending}
                />
              </div>
            ) : (
              <>
                {mandatoryEvents.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-destructive mb-2">必须参加 ({mandatoryEvents.length})</div>
                    <div className="space-y-2">
                      {mandatoryEvents.map((e: any) => (
                        <EventQuickCard key={e.id} event={e} onClick={() => setSelectedEvent(e)} status="mandatory" />
                      ))}
                    </div>
                  </div>
                )}
                {registeredEvents.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-green-600 mb-2">已报名 ({registeredEvents.length})</div>
                    <div className="space-y-2">
                      {registeredEvents.map((e: any) => (
                        <EventQuickCard key={e.id} event={e} onClick={() => setSelectedEvent(e)} status="going" />
                      ))}
                    </div>
                  </div>
                )}
                {pendingEvents.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-blue-600 mb-2">待报名 ({pendingEvents.length})</div>
                    <div className="space-y-2">
                      {pendingEvents.map((e: any) => (
                        <EventQuickCard key={e.id} event={e} onClick={() => setSelectedEvent(e)} status="pending" />
                      ))}
                    </div>
                  </div>
                )}
                {selectedDateEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center">No events on this day</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EventQuickCard({ event, onClick, status }: { event: any; onClick: () => void; status: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-colors hover:shadow-sm ${
        status === "mandatory"
          ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
          : status === "going"
          ? "border-green-200 bg-green-50 hover:bg-green-100"
          : "border-border bg-card hover:bg-muted/50"
      }`}
    >
      <div className="font-medium text-sm">{event.title}</div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {format(new Date(event.start_time), "h:mm a")}
        {event.is_online && " · Online"}
        {!event.is_online && event.location && ` · ${event.location}`}
      </div>
      {status === "mandatory" && event.is_online && event.meeting_link && (
        <a
          href={event.meeting_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:underline"
        >
          Join Zoom →
        </a>
      )}
    </button>
  );
}
