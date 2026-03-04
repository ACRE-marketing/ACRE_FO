import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Clock, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const stageColors: Record<string, string> = {
  new_lead: "bg-primary/10 text-primary",
  contacted: "bg-blue-100 text-blue-700",
  touring: "bg-amber-100 text-amber-700",
  negotiating: "bg-purple-100 text-purple-700",
  signed: "bg-emerald-100 text-emerald-700",
  paused: "bg-muted text-muted-foreground",
};

const stageLabels: Record<string, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  touring: "Touring",
  negotiating: "Negotiating",
  signed: "Signed",
  paused: "Paused",
};

export default function Clients() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "", source: "", needs_summary: "", notes: "",
    stage: "new_lead" as const, reminder_interval_days: 7,
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", user?.id, search],
    queryFn: async () => {
      let q = supabase.from("clients").select("*").eq("agent_id", user!.id).order("created_at", { ascending: false });
      if (search) q = q.ilike("name", `%${search}%`);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const nextFollowup = new Date(today);
      nextFollowup.setDate(today.getDate() + form.reminder_interval_days);
      const { error } = await supabase.from("clients").insert({
        agent_id: user!.id,
        name: form.name,
        source: form.source,
        needs_summary: form.needs_summary,
        notes: form.notes,
        stage: form.stage,
        reminder_interval_days: form.reminder_interval_days,
        last_contact_at: new Date().toISOString(),
        next_followup_date: nextFollowup.toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client created");
      setOpen(false);
      setForm({ name: "", source: "", needs_summary: "", notes: "", stage: "new_lead", reminder_interval_days: 7 });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold font-display">My Clients</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Client</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">New Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Source</Label><Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="WeChat, Referral, etc." /></div>
              <div>
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={(v: any) => setForm((f) => ({ ...f, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(stageLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Needs Summary</Label><Textarea value={form.needs_summary} onChange={(e) => setForm((f) => ({ ...f, needs_summary: e.target.value }))} rows={3} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              <div><Label>Reminder Interval (days)</Label><Input type="number" value={form.reminder_interval_days} onChange={(e) => setForm((f) => ({ ...f, reminder_interval_days: Number(e.target.value) }))} /></div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No clients yet</div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Link key={client.id} to={`/clients/${client.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{client.name}</h3>
                      <Badge className={`stage-badge ${stageColors[client.stage]}`}>{stageLabels[client.stage]}</Badge>
                    </div>
                    {client.needs_summary && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{client.needs_summary}</p>
                    )}
                  </div>
                  {client.next_followup_date && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(client.next_followup_date).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
