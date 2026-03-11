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
import { Plus } from "lucide-react";
import { toast } from "sonner";

const INITIAL_FORM = {
  title: "", description: "", event_type: "activity", location: "", area: "",
  is_online: false, meeting_link: "", zoom_password: "", start_time: "", end_time: "",
  is_recurring: false, recurrence_rule: "", is_mandatory: false, external_rsvp_url: "",
};

export default function CreateEventDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

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
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event created");
      setOpen(false);
      setForm(INITIAL_FORM);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" />Create Event</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
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
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} /></div>

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
            <div><Label>Area (public)</Label><Input value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Williamsburg, Brooklyn" /></div>
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
            <Label>External RSVP URL (optional)</Label>
            <Input value={form.external_rsvp_url} onChange={(e) => set("external_rsvp_url", e.target.value)} placeholder="https://forms.office.com/..." />
            <p className="text-xs text-muted-foreground mt-1">If set, agents must complete this form before their internal RSVP counts.</p>
          </div>

          <Button onClick={() => createEvent.mutate()} disabled={!form.title || !form.start_time || createEvent.isPending} className="w-full">
            {createEvent.isPending ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
