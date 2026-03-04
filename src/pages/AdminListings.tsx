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
import { Plus, Pencil, ToggleLeft, ToggleRight, Link as LinkIcon, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];
type Listing = Database["public"]["Tables"]["listings"]["Row"];

const AREAS: { value: string; label: string }[] = [
  { value: "Manhattan", label: "Manhattan" },
  { value: "LIC", label: "LIC" },
  { value: "Queens", label: "Queens" },
  { value: "Flushing", label: "Flushing" },
  { value: "Brooklyn", label: "Brooklyn" },
  { value: "Jersey City", label: "Jersey City" },
  { value: "Long Island", label: "Long Island" },
  { value: "Astoria", label: "Astoria" },
  { value: "Williamsburg", label: "Williamsburg" },
  { value: "Hoboken", label: "Hoboken" },
  { value: "Bronx", label: "Bronx" },
  { value: "Staten Island", label: "Staten Island" },
  { value: "Other", label: "Other" },
];

type ScrapedData = {
  title: string;
  cover_image: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  area: string | null;
  source_url: string;
};

export default function AdminListings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Step flow: 'url' → 'review' → (saved)
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"url" | "review">("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<ListingInsert>>({
    title: "", source_url: "", cover_image: "", listing_type: "featured",
    promo_tag: undefined, area: "Manhattan", price: undefined, beds: undefined, baths: undefined,
  });

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleScrape = async () => {
    if (!sourceUrl.trim()) { toast.error("请输入链接"); return; }
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-listing", {
        body: { url: sourceUrl.trim() },
      });
      if (error) throw error;
      const scraped = data as ScrapedData;
      setForm({
        title: scraped.title || "",
        source_url: scraped.source_url,
        cover_image: scraped.cover_image || "",
        price: scraped.price ?? undefined,
        beds: scraped.beds ?? undefined,
        baths: scraped.baths ?? undefined,
        area: (scraped.area as any) || "Manhattan",
        listing_type: "featured",
        promo_tag: undefined,
      });
      setStep("review");
      toast.success("信息抓取成功，请审核");
    } catch (err: any) {
      toast.error("抓取失败: " + (err.message || "Unknown error"));
    } finally {
      setScraping(false);
    }
  };

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
      toast.success(editId ? "Listing 已更新" : "Listing 已创建");
      handleClose();
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
    setStep("review");
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setStep("url");
    setSourceUrl("");
    setEditId(null);
    setForm({
      title: "", source_url: "", cover_image: "", listing_type: "featured",
      promo_tag: undefined, area: "Manhattan", price: undefined, beds: undefined, baths: undefined,
    });
  };

  const setField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold font-display">管理 Listings</h1>
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />新建 Listing</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editId ? "编辑 Listing" : step === "url" ? "粘贴房源链接" : "审核 Listing 信息"}
              </DialogTitle>
            </DialogHeader>

            {/* Step 1: Paste URL */}
            {step === "url" && !editId && (
              <div className="space-y-4 mt-2">
                <div>
                  <Label>房源链接</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://www.zillow.com/..."
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={handleScrape} disabled={scraping || !sourceUrl.trim()}>
                      {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : "抓取"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    粘贴外部房源链接，系统会自动提取标题、图片、价格等信息
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Review & edit scraped data */}
            {step === "review" && (
              <div className="space-y-3 mt-2">
                {/* Preview image */}
                {form.cover_image && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img src={form.cover_image} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div><Label>标题</Label><Input value={form.title || ""} onChange={(e) => setField("title", e.target.value)} /></div>
                <div><Label>封面图片 URL</Label><Input value={form.cover_image || ""} onChange={(e) => setField("cover_image", e.target.value)} /></div>
                <div><Label>来源链接</Label><Input value={form.source_url || ""} onChange={(e) => setField("source_url", e.target.value)} disabled={!editId} /></div>

                <div className="grid grid-cols-3 gap-3">
                  <div><Label>价格</Label><Input type="number" value={form.price ?? ""} onChange={(e) => setField("price", e.target.value ? Number(e.target.value) : null)} /></div>
                  <div><Label>卧室</Label><Input type="number" value={form.beds ?? ""} onChange={(e) => setField("beds", e.target.value ? Number(e.target.value) : null)} /></div>
                  <div><Label>浴室</Label><Input type="number" value={form.baths ?? ""} onChange={(e) => setField("baths", e.target.value ? Number(e.target.value) : null)} /></div>
                </div>

                <div>
                  <Label>区域</Label>
                  <Select value={form.area as string} onValueChange={(v) => setField("area", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AREAS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>类型 *</Label>
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
                    <Label>推广标签</Label>
                    <Select value={form.promo_tag || "none"} onValueChange={(v) => setField("promo_tag", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        <SelectItem value="limited_offer">Limited Offer</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="new_development">New Development</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending} className="w-full">
                  {saveMutation.isPending ? "保存中..." : <><Check className="w-4 h-4 mr-2" />{editId ? "更新" : "确认发布"}</>}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">暂无 Listings</div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>区域</TableHead>
                <TableHead>价格</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{l.title}</TableCell>
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
