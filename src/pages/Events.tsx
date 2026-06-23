import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, subMonths, addWeeks, subWeeks, format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isAfter, startOfDay } from "date-fns";
import { toast } from "sonner";
import CalendarGrid from "@/components/events/CalendarGrid";
import WeekView from "@/components/events/WeekView";
import EventDetailPanel from "@/components/events/EventDetailPanel";
import CreateEventDialog from "@/components/events/CreateEventDialog";
import UpcomingEventCard from "@/components/events/UpcomingEventCard";
import { generateRecurringInstances, type RecurringTemplate } from "@/components/events/recurringEvents";

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

  // Upcoming events (always shown in side panel) - dedupe recurring to nearest instance
  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const future = allEvents
      .filter((e: any) => isAfter(new Date(e.start_time), today))
      .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const seenRecurring = new Set<string>();
    return future.filter((e: any) => {
      const templateId = e.template_id;
      if (templateId) {
        if (seenRecurring.has(templateId)) return false;
        seenRecurring.add(templateId);
      }
      return true;
    });
  }, [allEvents]);

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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Calendar */}
          <div className="lg:col-span-3">
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

          {/* Upcoming side panel - always shows upcoming, never date-filtered */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Upcoming Events</h3>
              {selectedEvent && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)} className="text-xs h-7">
                  ← Back
                </Button>
              )}
            </div>

            {selectedEvent ? (
              <EventDetailPanel
                event={selectedEvent}
                myRsvpStatus={rsvpStatuses[selectedEvent.id] ?? null}
                goingCount={getGoingCount(selectedEvent.id)}
                goingNames={getGoingNames(selectedEvent.id)}
                onRsvp={(status) => rsvpMutation.mutate({ eventId: selectedEvent.id, status })}
                rsvpLoading={rsvpMutation.isPending}
              />
            ) : upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No upcoming events</p>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
                {upcomingEvents.map((e: any) => (
                  <UpcomingEventCard
                    key={e.id}
                    event={e}
                    goingCount={getGoingCount(e.id)}
                    myRsvpStatus={rsvpStatuses[e.id] ?? null}
                    onSignUp={() => rsvpMutation.mutate({ eventId: e.id, status: "going" })}
                    onCancel={() => rsvpMutation.mutate({ eventId: e.id, status: "not_going" })}
                    onOpen={() => setSelectedEvent(e)}
                    rsvpLoading={rsvpMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
