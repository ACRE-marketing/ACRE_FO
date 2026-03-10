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
import { Plus, User, Clock, Search, AlertTriangle, Camera, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const stageColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  opportunity: "bg-amber-100 text-amber-700",
  lost: "bg-red-100 text-red-700",
  pending: "bg-muted text-muted-foreground",
};

const stageLabels: Record<string, string> = {
  active: "Active",
  opportunity: "Opportunity",
  lost: "Lost",
  pending: "Pending",
};

const channelOptions = ["WeChat", "Phone", "Email", "Referral", "Walk-in", "Other"];
const businessTypeOptions = ["Buy", "Rent", "Both"];

export default function Clients() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [form, setForm] = useState({
    name: "", source: "", needs_summary: "", notes: "",
    stage: "active" as string, reminder_interval_days: 15,
    contact_channel: "", business_type: "", client_occupation: "",
    target_area: "", budget: "", preferred_unit_type: "",
    email: "", phone: "", wechat: "",
  });
  const [aiLoading, setAiLoading] = useState(false);

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiLoading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("extract-client-info", {
        body: { image_base64: base64 },
      });

      if (error) throw error;
      if (data?.data) {
        const d = data.data;
        setForm((f) => ({
          ...f,
          name: d.name || f.name,
          budget: d.budget || f.budget,
          target_area: d.target_area || f.target_area,
          preferred_unit_type: d.preferred_unit_type || f.preferred_unit_type,
          business_type: d.business_type || f.business_type,
          needs_summary: d.needs_summary || f.needs_summary,
          client_occupation: d.client_occupation || f.client_occupation,
          wechat: d.wechat || f.wechat,
        }));
        toast.success("AI extracted client info from screenshot");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to extract info");
    } finally {
      setAiLoading(false);
    }
  };

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", user?.id, search, stageFilter],
    queryFn: async () => {
      let q = supabase.from("clients").select("*").eq("agent_id", user!.id).order("created_at", { ascending: false });
      if (search) q = q.ilike("name", `%${search}%`);
      if (stageFilter !== "all") q = q.eq("stage", stageFilter as any);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user,
  });

  const now = new Date();
  const overdueClients = clients.filter((c) => {
    if (c.stage !== "active" && c.stage !== "opportunity") return false;
    if (!c.last_contact_at) return true;
    const diff = (now.getTime() - new Date(c.last_contact_at).getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 15;
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const nextFollowup = new Date(today);
      nextFollowup.setDate(today.getDate() + form.reminder_interval_days);
      const { error } = await supabase.from("clients").insert({
        agent_id: user!.id,
        name: form.name,
        source: form.source || null,
        needs_summary: form.needs_summary || null,
        notes: form.notes || null,
        stage: form.stage as any,
        reminder_interval_days: form.reminder_interval_days,
        last_contact_at: new Date().toISOString(),
        next_followup_date: nextFollowup.toISOString().split("T")[0],
        contact_channel: form.contact_channel || null,
        business_type: form.business_type || null,
        client_occupation: form.client_occupation || null,
        target_area: form.target_area || null,
        budget: form.budget || null,
        preferred_unit_type: form.preferred_unit_type || null,
        email: form.email || null,
        phone: form.phone || null,
        wechat: form.wechat || null,
        contact_date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client created");
      setOpen(false);
      setForm({ name: "", source: "", needs_summary: "", notes: "", stage: "active", reminder_interval_days: 15, contact_channel: "", business_type: "", client_occupation: "", target_area: "", budget: "", preferred_unit_type: "", email: "", phone: "", wechat: "" });
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
            {/* AI Screenshot Upload */}
            <label className="cursor-pointer">
              <input type="file" className="hidden" accept="image/*" onChange={handleScreenshotUpload} disabled={aiLoading} />
              <div className="flex items-center gap-2 p-3 rounded-md border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors text-sm text-primary">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {aiLoading ? "AI analyzing screenshot..." : "Upload WeChat screenshot to auto-fill"}
              </div>
            </label>
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Contact Channel</Label>
                  <Select value={form.contact_channel} onValueChange={(v) => setForm((f) => ({ ...f, contact_channel: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {channelOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Business Type</Label>
                  <Select value={form.business_type} onValueChange={(v) => setForm((f) => ({ ...f, business_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {businessTypeOptions.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>WeChat</Label><Input value={form.wechat} onChange={(e) => setForm((f) => ({ ...f, wechat: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(stageLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Source</Label><Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="WeChat group, Referral, etc." /></div>
              <div><Label>Occupation</Label><Input value={form.client_occupation} onChange={(e) => setForm((f) => ({ ...f, client_occupation: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Target Area</Label><Input value={form.target_area} onChange={(e) => setForm((f) => ({ ...f, target_area: e.target.value }))} placeholder="LIC, Manhattan..." /></div>
                <div><Label>Budget</Label><Input value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} placeholder="$500K-$800K" /></div>
              </div>
              <div><Label>Preferred Unit Type</Label><Input value={form.preferred_unit_type} onChange={(e) => setForm((f) => ({ ...f, preferred_unit_type: e.target.value }))} placeholder="1BR, 2BR..." /></div>
              <div><Label>Needs Summary</Label><Textarea value={form.needs_summary} onChange={(e) => setForm((f) => ({ ...f, needs_summary: e.target.value }))} rows={2} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              <div><Label>Reminder Interval (days)</Label><Input type="number" value={form.reminder_interval_days} onChange={(e) => setForm((f) => ({ ...f, reminder_interval_days: Number(e.target.value) }))} /></div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {overdueClients.length > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              <strong>{overdueClients.length}</strong> client(s) haven't been contacted in 15+ days and need follow-up.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {Object.entries(stageLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No clients yet</div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => {
            const isOverdue = client.stage === "active" || client.stage === "opportunity"
              ? client.last_contact_at
                ? (now.getTime() - new Date(client.last_contact_at).getTime()) / (1000 * 60 * 60 * 24) >= 15
                : true
              : false;
            return (
              <Link key={client.id} to={`/clients/${client.id}`}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer ${isOverdue ? "border-amber-300" : ""}`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isOverdue ? "bg-amber-100" : "bg-primary/10"}`}>
                      {isOverdue ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <User className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{client.name}</h3>
                        <Badge className={stageColors[client.stage]}>{stageLabels[client.stage]}</Badge>
                        {(client as any).business_type && <Badge variant="outline" className="text-[10px]">{(client as any).business_type}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {(client as any).target_area && <span className="text-xs text-muted-foreground">{(client as any).target_area}</span>}
                        {(client as any).budget && <span className="text-xs text-muted-foreground">{(client as any).budget}</span>}
                        {client.needs_summary && <span className="text-xs text-muted-foreground truncate">{client.needs_summary}</span>}
                      </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
