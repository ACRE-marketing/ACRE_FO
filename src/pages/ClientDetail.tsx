import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Upload, Plus, Phone, Mail, MessageSquare, Briefcase, MapPin, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const stageLabels: Record<string, string> = {
  active: "Active", opportunity: "Opportunity", lost: "Lost", pending: "Pending",
};
const stageColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700", opportunity: "bg-amber-100 text-amber-700",
  lost: "bg-red-100 text-red-700", pending: "bg-muted text-muted-foreground",
};

export default function ClientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [delayDays, setDelayDays] = useState(3);
  const [editNotes, setEditNotes] = useState("");
  const [showEditNotes, setShowEditNotes] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["client-attachments", id],
    queryFn: async () => {
      const { data } = await supabase.from("client_attachments").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["followup-logs", id],
    queryFn: async () => {
      const { data } = await supabase.from("followup_logs").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const updateStage = useMutation({
    mutationFn: async (stage: string) => {
      const { error } = await supabase.from("clients").update({ stage: stage as any, last_contact_at: new Date().toISOString() }).eq("id", id!);
      if (error) throw error;
      await supabase.from("followup_logs").insert({ client_id: id!, action: `Stage changed to ${stageLabels[stage]}` });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["followup-logs", id] });
      toast.success("Stage updated");
    },
  });

  const updateNotes = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").update({
        notes: editNotes,
        last_contact_at: new Date().toISOString(),
      }).eq("id", id!);
      if (error) throw error;
      await supabase.from("followup_logs").insert({ client_id: id!, action: "Notes updated" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["followup-logs", id] });
      toast.success("Notes saved");
      setShowEditNotes(false);
    },
  });

  const delayReminder = useMutation({
    mutationFn: async () => {
      if (!client?.next_followup_date) return;
      const current = new Date(client.next_followup_date);
      current.setDate(current.getDate() + delayDays);
      const { error } = await supabase.from("clients").update({ next_followup_date: current.toISOString().split("T")[0] }).eq("id", id!);
      if (error) throw error;
      await supabase.from("followup_logs").insert({ client_id: id!, action: `Reminder delayed by ${delayDays} days` });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["followup-logs", id] });
      toast.success("Reminder delayed");
    },
  });

  const markContacted = useMutation({
    mutationFn: async () => {
      const nextFollowup = new Date();
      nextFollowup.setDate(nextFollowup.getDate() + (client?.reminder_interval_days ?? 15));
      const { error } = await supabase.from("clients").update({
        last_contact_at: new Date().toISOString(),
        next_followup_date: nextFollowup.toISOString().split("T")[0],
      }).eq("id", id!);
      if (error) throw error;
      await supabase.from("followup_logs").insert({ client_id: id!, action: "Marked as contacted" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["followup-logs", id] });
      toast.success("Contact recorded");
    },
  });

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const path = `${user.id}/${id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("client-attachments").upload(path, file);
    if (uploadError) { toast.error(uploadError.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("client-attachments").getPublicUrl(path);
    await supabase.from("client_attachments").insert({ client_id: id!, file_url: publicUrl });
    qc.invalidateQueries({ queryKey: ["client-attachments", id] });
    toast.success("File uploaded");
  };

  if (isLoading) return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!client) return <div className="text-center py-16 text-muted-foreground">Client not found</div>;

  const cl = client as any; // for new fields not yet in types
  const isOverdue = (client.stage === "active" || client.stage === "opportunity") &&
    client.last_contact_at &&
    (new Date().getTime() - new Date(client.last_contact_at).getTime()) / (1000 * 60 * 60 * 24) >= 15;

  return (
    <div>
      <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Client Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display">{client.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {isOverdue && <Badge variant="destructive" className="text-xs">15+ days overdue</Badge>}
                  <Badge className={stageColors[client.stage]}>{stageLabels[client.stage]}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Info Row */}
              <div className="flex flex-wrap gap-4 text-sm">
                {cl.wechat && <span className="flex items-center gap-1 text-muted-foreground"><MessageSquare className="w-3 h-3" />{cl.wechat}</span>}
                {cl.phone && <span className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{cl.phone}</span>}
                {cl.email && <span className="flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{cl.email}</span>}
                {cl.client_occupation && <span className="flex items-center gap-1 text-muted-foreground"><Briefcase className="w-3 h-3" />{cl.client_occupation}</span>}
              </div>

              {/* Key Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cl.target_area && (
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Target Area</p>
                    <p className="text-sm font-medium">{cl.target_area}</p>
                  </div>
                )}
                {cl.budget && (
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" />Budget</p>
                    <p className="text-sm font-medium">{cl.budget}</p>
                  </div>
                )}
                {cl.business_type && (
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-[10px] text-muted-foreground">Business Type</p>
                    <p className="text-sm font-medium">{cl.business_type}</p>
                  </div>
                )}
                {cl.preferred_unit_type && (
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-[10px] text-muted-foreground">Unit Type</p>
                    <p className="text-sm font-medium">{cl.preferred_unit_type}</p>
                  </div>
                )}
              </div>

              {client.source && <div><Label className="text-muted-foreground text-xs">Source</Label><p className="text-sm">{client.source}</p></div>}
              {client.needs_summary && <div><Label className="text-muted-foreground text-xs">Needs Summary</Label><p className="text-sm">{client.needs_summary}</p></div>}

              {/* Notes with edit */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs">Notes</Label>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setEditNotes(client.notes || ""); setShowEditNotes(!showEditNotes); }}>
                    {showEditNotes ? "Cancel" : "Edit"}
                  </Button>
                </div>
                {showEditNotes ? (
                  <div className="mt-1 space-y-2">
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
                    <Button size="sm" onClick={() => updateNotes.mutate()} disabled={updateNotes.isPending}>Save</Button>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{client.notes || "No notes"}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-display">Attachments</CardTitle>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" accept="image/*" onChange={uploadFile} />
                  <Button variant="outline" size="sm" asChild><span><Upload className="w-3 h-3 mr-1" />Upload</span></Button>
                </label>
              </div>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments yet</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {attachments.map((a) => (
                    <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer">
                      <img src={a.file_url} alt="attachment" className="w-full h-24 object-cover rounded-md border" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader><CardTitle className="text-base font-display">Activity Log</CardTitle></CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <div>
                        <p>{log.action}</p>
                        <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base font-display">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant={isOverdue ? "destructive" : "default"} onClick={() => markContacted.mutate()} disabled={markContacted.isPending}>
                Mark as Contacted
              </Button>

              <div>
                <Label className="text-xs text-muted-foreground">Update Stage</Label>
                <Select value={client.stage} onValueChange={(v) => updateStage.mutate(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(stageLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Next Follow-up</Label>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {client.next_followup_date ? new Date(client.next_followup_date).toLocaleDateString() : "Not set"}
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Delay Reminder</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="number" value={delayDays} onChange={(e) => setDelayDays(Number(e.target.value))} className="w-20" min={1} />
                  <Button variant="outline" size="sm" onClick={() => delayReminder.mutate()}>
                    <Plus className="w-3 h-3 mr-1" />days
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Contact</span>
                <span>{client.last_contact_at ? new Date(client.last_contact_at).toLocaleDateString() : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reminder Interval</span>
                <span>{client.reminder_interval_days ?? 15} days</span>
              </div>
              {cl.contact_channel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Channel</span>
                  <span>{cl.contact_channel}</span>
                </div>
              )}
              {cl.contact_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">First Contact</span>
                  <span>{new Date(cl.contact_date).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(client.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
