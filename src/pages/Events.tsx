import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Video, Users, Check, X, Plus, Clock, Download } from "lucide-react";
import { toast } from "sonner";

function generateICS(event: any): string {
  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = formatDate(new Date(event.start_time));
  const end = event.end_time ? formatDate(new Date(event.end_time)) : formatDate(new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000));
  const location = event.is_online && event.meeting_link ? event.meeting_link : event.location || "";
  const description = [event.description, event.is_online && event.meeting_link ? `Join: ${event.meeting_link}` : ""].filter(Boolean).join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ACRE//Events//EN",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    `UID:${event.id}@acre.lovable.app`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(event: any) {
  const ics = generateICS(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Calendar invite downloaded");
}

const eventTypeLabels: Record<string, string> = {
  activity: "Activity", training: "Training", admin: "Admin Notice",
};
const eventTypeColors: Record<string, string> = {
  activity: "bg-primary/10 text-primary", training: "bg-blue-100 text-blue-700", admin: "bg-amber-100 text-amber-700",
};

export default function Events() {
  const { user, isPM } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", event_type: "activity", location: "",
    is_online: false, meeting_link: "", start_time: "", end_time: "",
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("start_time", { ascending: true });
      return data ?? [];
    },
  });

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

  const createEvent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").insert({
        title: form.title,
        description: form.description || null,
        event_type: form.event_type,
        location: form.location || null,
        is_online: form.is_online,
        meeting_link: form.meeting_link || null,
        start_time: new Date(form.start_time).toISOString(),
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event created");
      setCreateOpen(false);
      setForm({ title: "", description: "", event_type: "activity", location: "", is_online: false, meeting_link: "", start_time: "", end_time: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
      const { error } = await supabase.from("event_rsvps").upsert({
        event_id: eventId,
        user_id: user!.id,
        status,
      } as any, { onConflict: "event_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-rsvps"] });
      qc.invalidateQueries({ queryKey: ["all-rsvps"] });
      toast.success("RSVP updated");
    },
  });

  const now = new Date();
  const upcoming = events.filter((e: any) => new Date(e.start_time) >= now);
  const past = events.filter((e: any) => new Date(e.start_time) < now);

  const getRsvpStatus = (eventId: string) => {
    const r = rsvps.find((r: any) => r.event_id === eventId);
    return r ? (r as any).status : null;
  };

  const getEventRsvpCount = (eventId: string) => {
    return allRsvps.filter((r: any) => r.event_id === eventId && r.status === "going").length;
  };

  const EventCard = ({ event }: { event: any }) => {
    const myStatus = getRsvpStatus(event.id);
    const goingCount = getEventRsvpCount(event.id);
    const isPast = new Date(event.start_time) < now;

    return (
      <Card className={isPast ? "opacity-60" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{event.title}</h3>
                <Badge className={eventTypeColors[event.event_type]}>{eventTypeLabels[event.event_type]}</Badge>
              </div>
              {event.description && <p className="text-sm text-muted-foreground mb-2">{event.description}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(event.start_time).toLocaleDateString()} {new Date(event.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {event.end_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Until {new Date(event.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>}
            {event.is_online && event.meeting_link && (
              <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <Video className="w-3 h-3" />Join Online
              </a>
            )}
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{goingCount} going</span>
          </div>

          {!isPast && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={myStatus === "going" ? "default" : "outline"}
                onClick={() => rsvpMutation.mutate({ eventId: event.id, status: "going" })}
                disabled={rsvpMutation.isPending}
              >
                <Check className="w-3 h-3 mr-1" />Going
              </Button>
              <Button
                size="sm"
                variant={myStatus === "not_going" ? "destructive" : "outline"}
                onClick={() => rsvpMutation.mutate({ eventId: event.id, status: "not_going" })}
                disabled={rsvpMutation.isPending}
              >
                <X className="w-3 h-3 mr-1" />Can't Go
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadICS(event)}
              >
                <Download className="w-3 h-3 mr-1" />Add to Calendar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display">Events</h1>
        {isPM && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Create Event</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.event_type} onValueChange={(v) => setForm((f) => ({ ...f, event_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activity">Activity</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="admin">Admin Notice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Time *</Label><Input type="datetime-local" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} /></div>
                  <div><Label>End Time</Label><Input type="datetime-local" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} /></div>
                </div>
                <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_online} onCheckedChange={(v) => setForm((f) => ({ ...f, is_online: v }))} />
                  <Label>Online Event</Label>
                </div>
                {form.is_online && (
                  <div><Label>Meeting Link</Label><Input value={form.meeting_link} onChange={(e) => setForm((f) => ({ ...f, meeting_link: e.target.value }))} placeholder="https://zoom.us/..." /></div>
                )}
                <Button onClick={() => createEvent.mutate()} disabled={!form.title || !form.start_time || createEvent.isPending} className="w-full">
                  {createEvent.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((e: any) => <EventCard key={e.id} event={e} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Past Events</h2>
              <div className="space-y-3">
                {past.map((e: any) => <EventCard key={e.id} event={e} />)}
              </div>
            </div>
          )}
          {events.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No events yet</div>
          )}
        </div>
      )}
    </div>
  );
}
