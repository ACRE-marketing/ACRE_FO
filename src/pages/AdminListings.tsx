import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];
type Listing = Database["public"]["Tables"]["listings"]["Row"];

const emptyForm: Partial<ListingInsert> = {
  title: "", source_url: "", cover_image: "", listing_type: "featured",
  promo_tag: undefined, area: "Manhattan", price: undefined, beds: undefined, baths: undefined,
};

export default function AdminListings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<ListingInsert>>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, created_by: user!.id } as ListingInsert;
      if (editId) {
        const { error } = await supabase.from("listings").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("listings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-listings"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success(editId ? "Listing updated" : "Listing created");
      setOpen(false);
      setForm(emptyForm);
      setEditId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async (listing: Listing) => {
      const newStatus = listing.status === "active" ? "inactive" : "active";
      const { error } = await supabase.from("listings").update({ status: newStatus }).eq("id", listing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-listings"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
    },
  });

  const openEdit = (listing: Listing) => {
    setForm({
      title: listing.title, source_url: listing.source_url || "", cover_image: listing.cover_image || "",
      listing_type: listing.listing_type, promo_tag: listing.promo_tag || undefined,
      area: listing.area, price: listing.price ? Number(listing.price) : undefined,
      beds: listing.beds ?? undefined, baths: listing.baths ?? undefined,
    });
    setEditId(listing.id);
    setOpen(true);
  };

  const setField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold font-display">Manage Listings</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />New Listing</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editId ? "Edit Listing" : "Create Listing"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div><Label>Title *</Label><Input value={form.title || ""} onChange={(e) => setField("title", e.target.value)} /></div>
              <div><Label>Source URL</Label><Input value={form.source_url || ""} onChange={(e) => setField("source_url", e.target.value)} placeholder="https://..." /></div>
              <div><Label>Cover Image URL</Label><Input value={form.cover_image || ""} onChange={(e) => setField("cover_image", e.target.value)} placeholder="https://..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.listing_type} onValueChange={(v) => setField("listing_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company_exclusive">Exclusive</SelectItem>
                      <SelectItem value="featured">Featured</SelectItem>
                      <SelectItem value="agent_exclusive">Agent Exclusive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Area</Label>
                  <Select value={form.area} onValueChange={(v) => setField("area", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LIC">LIC</SelectItem>
                      <SelectItem value="Manhattan">Manhattan</SelectItem>
                      <SelectItem value="Jersey City">Jersey City</SelectItem>
                      <SelectItem value="Long Island">Long Island</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Promo Tag</Label>
                <Select value={form.promo_tag || "none"} onValueChange={(v) => setField("promo_tag", v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="limited_offer">Limited Offer</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="new_development">New Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Price</Label><Input type="number" value={form.price ?? ""} onChange={(e) => setField("price", e.target.value ? Number(e.target.value) : null)} /></div>
                <div><Label>Beds</Label><Input type="number" value={form.beds ?? ""} onChange={(e) => setField("beds", e.target.value ? Number(e.target.value) : null)} /></div>
                <div><Label>Baths</Label><Input type="number" value={form.baths ?? ""} onChange={(e) => setField("baths", e.target.value ? Number(e.target.value) : null)} /></div>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.title}</TableCell>
                  <TableCell>{l.area}</TableCell>
                  <TableCell>{l.price ? `$${Number(l.price).toLocaleString()}` : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{l.listing_type}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={l.status === "active" ? "default" : "secondary"}>{l.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(l)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleStatus.mutate(l)}>
                      {l.status === "active" ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
