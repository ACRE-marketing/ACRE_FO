import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const INITIAL_FORM = {
  title: "", description: "", event_type: "activity", location: "", area: "",
  is_online: false, meeting_link: "", zoom_password: "", start_time: "", end_time: "",
  is_recurring: false, recurrence_rule: "", is_mandatory: false, external_rsvp_url: "",
  capacity: "", rsvp_deadline: "", speaker: "",
};

export default function CreateEventDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [showRaw, setShowRaw] = useState(true);

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const parseText = async () => {
    if (!rawText.trim()) return;
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-event-text", {
        body: { rawText },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setForm((f) => ({
        ...f,
        title: data.title || f.title,
        description: data.description || f.description,
        event_type: data.event_type || f.event_type,
        external_rsvp_url: data.external_rsvp_url || f.external_rsvp_url,
        area: data.area || f.area,
        location: data.location || f.location,
        is_online: data.is_online ?? f.is_online,
        meeting_link: data.meeting_link || f.meeting_link,
        zoom_password: data.zoom_password || f.zoom_password,
        start_time: data.start_time ? new Date(data.start_time).toISOString().slice(0, 16) : f.start_time,
        end_time: data.end_time ? new Date(data.end_time).toISOString().slice(0, 16) : f.end_time,
      }));
      setShowRaw(false);
      toast.success("AI parsed event info — please review and adjust");
    } catch (e: any) {
      toast.error("Parse failed: " + e.message);
    } finally {
      setParsing(false);
    }
  };

  const createEvent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").insert({
        title: form.title,
        description: form.description || null,
        event_type: form.event_type,
        location: form.location || null,
        area: form.area || null,
        is_online: form.is_online,
        meeting_link: form.meeting_link || null,
        zoom_password: form.zoom_password || null,
        start_time: new Date(form.start_time).toISOString(),
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
        created_by: user!.id,
        is_recurring: form.is_recurring,
        recurrence_rule: form.is_recurring ? form.recurrence_rule : null,
        is_mandatory: form.is_mandatory,
        external_rsvp_url: form.external_rsvp_url || null,
        capacity: form.capacity ? parseInt(form.capacity, 10) : null,
        rsvp_deadline: form.rsvp_deadline ? new Date(form.rsvp_deadline).toISOString() : null,
        speaker: form.speaker || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event created");
      setOpen(false);
      setForm(INITIAL_FORM);
      setRawText("");
      setShowRaw(true);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setShowRaw(true); setRawText(""); } }}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" />Create Event</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">

          {/* AI Paste Area */}
          {showRaw && (
            <div className="space-y-2 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Sparkles className="w-4 h-4 text-primary" />
                Paste event info (AI will auto-extract)
              </Label>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={5}
                placeholder="Paste the full event text here — title, description, RSVP links, location, time, etc. AI will extract and organize everything automatically."
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={parseText} disabled={!rawText.trim() || parsing} size="sm" className="flex-1">
                  {parsing ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Parsing...</> : <><Sparkles className="w-3 h-3 mr-1" />Auto-Extract</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowRaw(false)} className="text-xs text-muted-foreground">
                  Skip, fill manually
                </Button>
              </div>
            </div>
          )}

          {!showRaw && (
            <Button variant="ghost" size="sm" onClick={() => setShowRaw(true)} className="text-xs text-muted-foreground w-full">
              <Sparkles className="w-3 h-3 mr-1" />Paste new text to re-parse
            </Button>
          )}

          {/* Structured Form */}
          <div><Label>Title *</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div>
            <Label>Type</Label>
            <Select value={form.event_type} onValueChange={(v) => set("event_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activity">Activity</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="admin">Admin Notice</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Description (key info only)</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} /></div>

          <div className="flex items-center gap-2">
            <Switch checked={form.is_mandatory} onCheckedChange={(v) => set("is_mandatory", v)} />
            <Label>Mandatory (all team must attend)</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.is_recurring} onCheckedChange={(v) => set("is_recurring", v)} />
            <Label>Recurring Event</Label>
          </div>
          {form.is_recurring && (
            <Select value={form.recurrence_rule} onValueChange={(v) => set("recurrence_rule", v)}>
              <SelectTrigger><SelectValue placeholder="Select recurrence..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly_thu">Every Thursday (Weekly Meeting)</SelectItem>
                <SelectItem value="monthly_first_fri">First Friday of Month (Monthly Meeting)</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Time *</Label><Input type="datetime-local" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} /></div>
            <div><Label>End Time</Label><Input type="datetime-local" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Area (public)</Label><Input value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Williamsburg" /></div>
            <div><Label>Full Address (registered only)</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Exact address" /></div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.is_online} onCheckedChange={(v) => set("is_online", v)} />
            <Label>Online Event</Label>
          </div>
          {form.is_online && (
            <>
              <div><Label>Meeting Link</Label><Input value={form.meeting_link} onChange={(e) => set("meeting_link", e.target.value)} placeholder="https://zoom.us/..." /></div>
              <div><Label>Zoom Password</Label><Input value={form.zoom_password} onChange={(e) => set("zoom_password", e.target.value)} placeholder="Optional" /></div>
            </>
          )}

          <div>
            <Label>External RSVP URL</Label>
            <Input value={form.external_rsvp_url} onChange={(e) => set("external_rsvp_url", e.target.value)} placeholder="https://forms.office.com/..." />
            <p className="text-xs text-muted-foreground mt-1">If set, agents must complete external form before in-app registration counts.</p>
          </div>

          {/* Office-added event fields (training / tour) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Capacity</Label>
              <Input type="number" min={1} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="e.g. 50" />
            </div>
            <div>
              <Label>RSVP Deadline</Label>
              <Input type="datetime-local" value={form.rsvp_deadline} onChange={(e) => set("rsvp_deadline", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Speaker / Host</Label>
            <Input value={form.speaker} onChange={(e) => set("speaker", e.target.value)} placeholder="e.g. Winnie Wu (CPA)" />
          </div>

          <Button onClick={() => createEvent.mutate()} disabled={!form.title || !form.start_time || createEvent.isPending} className="w-full">
            {createEvent.isPending ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
