import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Copy, User, Image, FileText, Award, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const materialTypes = [
  { value: "business_card", label: "Business Card", icon: FileText },
  { value: "headshot", label: "Headshot", icon: User },
  { value: "intro_poster", label: "Intro Poster", icon: Image },
  { value: "deal_poster", label: "Deal Record Poster", icon: Award },
  { value: "custom", label: "Custom", icon: Plus },
];

const materialTypeLabels: Record<string, string> = Object.fromEntries(materialTypes.map((t) => [t.value, t.label]));

export default function AgentProfile() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [uploadType, setUploadType] = useState("business_card");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploading, setUploading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "", bio: "", languages: "", specialties: "", phone: "", wechat: "",
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["agent-materials", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_materials")
        .select("*")
        .eq("agent_id", user!.id)
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: fullProfile } = useQuery({
    queryKey: ["full-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("agent-materials").upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("agent-materials").getPublicUrl(path);
      const { error } = await supabase.from("agent_materials").insert({
        agent_id: user.id,
        material_type: uploadType,
        title: uploadTitle || file.name,
        file_url: publicUrl,
        description: uploadDesc || null,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["agent-materials"] });
      toast.success("Material uploaded");
      setUploadOpen(false);
      setUploadTitle("");
      setUploadDesc("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agent_materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-materials"] });
      toast.success("Deleted");
    },
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({
        name: profileForm.name,
        bio: profileForm.bio || null,
        languages: profileForm.languages || null,
        specialties: profileForm.specialties || null,
        phone: profileForm.phone || null,
        wechat: profileForm.wechat || null,
      } as any).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["full-profile"] });
      toast.success("Profile updated");
      setEditProfile(false);
    },
  });

  const generateTrackingLink = (materialId: string) => {
    const link = `${window.location.origin}/m/${materialId}?agent=${user?.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Tracking link copied to clipboard");
  };

  const startEditProfile = () => {
    const p = fullProfile as any;
    setProfileForm({
      name: p?.name || "",
      bio: p?.bio || "",
      languages: p?.languages || "",
      specialties: p?.specialties || "",
      phone: p?.phone || "",
      wechat: p?.wechat || "",
    });
    setEditProfile(true);
  };

  const groupedMaterials = materialTypes.map((t) => ({
    ...t,
    items: materials.filter((m: any) => m.material_type === t.value),
  }));

  const fp = fullProfile as any;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display">My Profile & Materials</h1>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button><Upload className="w-4 h-4 mr-2" />Upload Material</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Material</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Type</Label>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {materialTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Optional title" /></div>
              <div><Label>Description</Label><Textarea value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} rows={2} placeholder="Optional description" /></div>
              <label className="cursor-pointer block">
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleUpload} disabled={uploading} />
                <Button variant="outline" className="w-full" asChild disabled={uploading}>
                  <span>{uploading ? "Uploading..." : "Choose File & Upload"}</span>
                </Button>
              </label>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Profile Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display">Agent Profile</CardTitle>
            <Button variant="outline" size="sm" onClick={editProfile ? () => setEditProfile(false) : startEditProfile}>
              {editProfile ? "Cancel" : "Edit Profile"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editProfile ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>WeChat</Label><Input value={profileForm.wechat} onChange={(e) => setProfileForm((f) => ({ ...f, wechat: e.target.value }))} /></div>
                <div><Label>Languages</Label><Input value={profileForm.languages} onChange={(e) => setProfileForm((f) => ({ ...f, languages: e.target.value }))} placeholder="English, Mandarin..." /></div>
              </div>
              <div><Label>Specialties</Label><Input value={profileForm.specialties} onChange={(e) => setProfileForm((f) => ({ ...f, specialties: e.target.value }))} placeholder="Luxury condos, Investment properties..." /></div>
              <div><Label>Bio</Label><Textarea value={profileForm.bio} onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))} rows={3} /></div>
              <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>Save Profile</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{fp?.name || "—"}</h3>
                  <p className="text-sm text-muted-foreground">{fp?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {fp?.phone && <div className="text-sm"><span className="text-muted-foreground text-xs block">Phone</span>{fp.phone}</div>}
                {fp?.wechat && <div className="text-sm"><span className="text-muted-foreground text-xs block">WeChat</span>{fp.wechat}</div>}
                {fp?.languages && <div className="text-sm"><span className="text-muted-foreground text-xs block">Languages</span>{fp.languages}</div>}
                {fp?.specialties && <div className="text-sm"><span className="text-muted-foreground text-xs block">Specialties</span>{fp.specialties}</div>}
              </div>
              {fp?.bio && <p className="text-sm mt-2">{fp.bio}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Materials by Type */}
      <Tabs defaultValue="business_card">
        <TabsList className="mb-4">
          {materialTypes.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1">
              <t.icon className="w-3 h-3" />{t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {groupedMaterials.map((group) => (
          <TabsContent key={group.value} value={group.value}>
            {group.items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No {group.label.toLowerCase()} uploaded yet
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((m: any) => (
                  <Card key={m.id} className="overflow-hidden">
                    <div className="aspect-[4/3] bg-muted">
                      <img src={m.file_url} alt={m.title} className="w-full h-full object-cover" />
                    </div>
                    <CardContent className="p-3 space-y-2">
                      <h4 className="font-medium text-sm truncate">{m.title}</h4>
                      {m.description && <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => generateTrackingLink(m.id)}>
                          <Copy className="w-3 h-3 mr-1" />Tracking Link
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" asChild>
                          <a href={m.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" /></a>
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => deleteMaterial.mutate(m.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
