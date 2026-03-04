import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, ToggleLeft, ToggleRight, Link as LinkIcon, Loader2, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];
type Listing = Database["public"]["Tables"]["listings"]["Row"];

const AREAS: { value: string; label: string }[] = [
  { value: "Manhattan", label: "Manhattan" }, { value: "LIC", label: "LIC" },
  { value: "Queens", label: "Queens" }, { value: "Flushing", label: "Flushing" },
  { value: "Brooklyn", label: "Brooklyn" }, { value: "Jersey City", label: "Jersey City" },
  { value: "Long Island", label: "Long Island" }, { value: "Astoria", label: "Astoria" },
  { value: "Williamsburg", label: "Williamsburg" }, { value: "Hoboken", label: "Hoboken" },
  { value: "Bronx", label: "Bronx" }, { value: "Staten Island", label: "Staten Island" },
  { value: "Other", label: "Other" },
];

type ScrapedData = {
  title: string; cover_image: string | null; price: number | null;
  beds: number | null; baths: number | null; area: string | null; source_url: string;
};

type FormState = Partial<ListingInsert> & {
  highlights_list?: string[];
  amenities_list?: string[];
  unit_types_list?: Array<{ type: string; price: string }>;
};

export default function AdminListings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"url" | "review">("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newHighlight, setNewHighlight] = useState("");
  const [newAmenity, setNewAmenity] = useState("");
  const [newUnitType, setNewUnitType] = useState("");
  const [newUnitPrice, setNewUnitPrice] = useState("");

  const [form, setForm] = useState<FormState>({
    title: "", source_url: "", cover_image: "", listing_type: "featured",
    promo_tag: undefined, area: "Manhattan", price: undefined, beds: undefined, baths: undefined,
    address: "", description: "", property_type: "", sponsor: "",
    total_floors: undefined, total_units: undefined, completion_date: "",
    transportation: "", schools: "", views_description: "",
    architecture: "", interior_design: "", investment_info: "",
    target_buyers: "", area_info: "", summary: "",
    highlights_list: [], amenities_list: [], unit_types_list: [],
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
      const { data, error } = await supabase.functions.invoke("scrape-listing", { body: { url: sourceUrl.trim() } });
      if (error) throw error;
      const scraped = data as ScrapedData;
      setForm((f) => ({
        ...f,
        title: scraped.title || "", source_url: scraped.source_url,
        cover_image: scraped.cover_image || "", price: scraped.price ?? undefined,
        beds: scraped.beds ?? undefined, baths: scraped.baths ?? undefined,
        area: (scraped.area as any) || "Manhattan",
      }));
      setStep("review");
      toast.success("信息抓取成功，请审核并补充详细信息");
    } catch (err: any) {
      toast.error("抓取失败: " + (err.message || "Unknown error"));
    } finally { setScraping(false); }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { highlights_list, amenities_list, unit_types_list, ...rest } = form;
      const payload = {
        ...rest,
        highlights: highlights_list && highlights_list.length > 0 ? highlights_list : [],
        amenities: amenities_list && amenities_list.length > 0 ? amenities_list : [],
        unit_types: unit_types_list && unit_types_list.length > 0 ? unit_types_list : [],
        created_by: user!.id,
      } as any;
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
    const hl = Array.isArray(listing.highlights) ? listing.highlights as string[] : [];
    const am = Array.isArray(listing.amenities) ? listing.amenities as string[] : [];
    const ut = Array.isArray(listing.unit_types) ? listing.unit_types as Array<{ type: string; price: string }> : [];
    setForm({
      title: listing.title, source_url: listing.source_url || "", cover_image: listing.cover_image || "",
      listing_type: listing.listing_type, promo_tag: listing.promo_tag || undefined,
      area: listing.area, price: listing.price ? Number(listing.price) : undefined,
      beds: listing.beds ?? undefined, baths: listing.baths ?? undefined,
      address: (listing as any).address || "", description: (listing as any).description || "",
      property_type: (listing as any).property_type || "", sponsor: (listing as any).sponsor || "",
      total_floors: (listing as any).total_floors ?? undefined, total_units: (listing as any).total_units ?? undefined,
      completion_date: (listing as any).completion_date || "",
      transportation: (listing as any).transportation || "", schools: (listing as any).schools || "",
      views_description: (listing as any).views_description || "",
      architecture: (listing as any).architecture || "", interior_design: (listing as any).interior_design || "",
      investment_info: (listing as any).investment_info || "", target_buyers: (listing as any).target_buyers || "",
      area_info: (listing as any).area_info || "", summary: (listing as any).summary || "",
      highlights_list: hl, amenities_list: am, unit_types_list: ut,
    });
    setEditId(listing.id);
    setStep("review");
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false); setStep("url"); setSourceUrl(""); setEditId(null);
    setForm({
      title: "", source_url: "", cover_image: "", listing_type: "featured",
      promo_tag: undefined, area: "Manhattan", price: undefined, beds: undefined, baths: undefined,
      address: "", description: "", property_type: "", sponsor: "",
      total_floors: undefined, total_units: undefined, completion_date: "",
      transportation: "", schools: "", views_description: "",
      architecture: "", interior_design: "", investment_info: "",
      target_buyers: "", area_info: "", summary: "",
      highlights_list: [], amenities_list: [], unit_types_list: [],
    });
    setNewHighlight(""); setNewAmenity(""); setNewUnitType(""); setNewUnitPrice("");
  };

  const setField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const addHighlight = () => {
    if (!newHighlight.trim()) return;
    setForm((f) => ({ ...f, highlights_list: [...(f.highlights_list || []), newHighlight.trim()] }));
    setNewHighlight("");
  };
  const addAmenity = () => {
    if (!newAmenity.trim()) return;
    setForm((f) => ({ ...f, amenities_list: [...(f.amenities_list || []), newAmenity.trim()] }));
    setNewAmenity("");
  };
  const addUnitType = () => {
    if (!newUnitType.trim() || !newUnitPrice.trim()) return;
    setForm((f) => ({ ...f, unit_types_list: [...(f.unit_types_list || []), { type: newUnitType.trim(), price: newUnitPrice.trim() }] }));
    setNewUnitType(""); setNewUnitPrice("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold font-display">管理 Listings</h1>
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />新建 Listing</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editId ? "编辑 Listing" : step === "url" ? "粘贴房源链接" : "审核 & 补充详细信息"}
              </DialogTitle>
            </DialogHeader>

            {step === "url" && !editId && (
              <div className="space-y-4 mt-2">
                <div>
                  <Label>房源链接</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://www.zillow.com/..." className="pl-9" />
                    </div>
                    <Button onClick={handleScrape} disabled={scraping || !sourceUrl.trim()}>
                      {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : "抓取"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">粘贴外部房源链接，系统会自动提取基本信息</p>
                </div>
              </div>
            )}

            {step === "review" && (
              <Tabs defaultValue="basic" className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="basic" className="flex-1">基本信息</TabsTrigger>
                  <TabsTrigger value="details" className="flex-1">详细描述</TabsTrigger>
                  <TabsTrigger value="units" className="flex-1">户型 & 配套</TabsTrigger>
                </TabsList>

                {/* Tab 1: Basic Info */}
                <TabsContent value="basic" className="space-y-3 mt-3">
                  {form.cover_image && (
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      <img src={form.cover_image} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div><Label>标题 *</Label><Input value={form.title || ""} onChange={(e) => setField("title", e.target.value)} /></div>
                  <div><Label>地址</Label><Input value={form.address || ""} onChange={(e) => setField("address", e.target.value)} placeholder="45-40 Vernon Boulevard, LIC, NY 11101" /></div>
                  <div><Label>封面图片 URL</Label><Input value={form.cover_image || ""} onChange={(e) => setField("cover_image", e.target.value)} /></div>
                  <div><Label>来源链接</Label><Input value={form.source_url || ""} onChange={(e) => setField("source_url", e.target.value)} disabled={!editId} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>价格</Label><Input type="number" value={form.price ?? ""} onChange={(e) => setField("price", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><Label>卧室</Label><Input type="number" value={form.beds ?? ""} onChange={(e) => setField("beds", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><Label>浴室</Label><Input type="number" value={form.baths ?? ""} onChange={(e) => setField("baths", e.target.value ? Number(e.target.value) : null)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>区域</Label>
                      <Select value={form.area as string} onValueChange={(v) => setField("area", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{AREAS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>物业类型</Label>
                      <Input value={form.property_type || ""} onChange={(e) => setField("property_type", e.target.value)} placeholder="Condominium" />
                    </div>
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
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Sponsor</Label><Input value={form.sponsor || ""} onChange={(e) => setField("sponsor", e.target.value)} /></div>
                    <div><Label>总楼层</Label><Input type="number" value={form.total_floors ?? ""} onChange={(e) => setField("total_floors", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><Label>总户数</Label><Input type="number" value={form.total_units ?? ""} onChange={(e) => setField("total_units", e.target.value ? Number(e.target.value) : null)} /></div>
                  </div>
                  <div><Label>预计完工</Label><Input value={form.completion_date || ""} onChange={(e) => setField("completion_date", e.target.value)} placeholder="2026年末" /></div>
                </TabsContent>

                {/* Tab 2: Detailed Descriptions */}
                <TabsContent value="details" className="space-y-3 mt-3">
                  <div><Label>项目概述</Label><Textarea value={form.description || ""} onChange={(e) => setField("description", e.target.value)} rows={4} placeholder="项目整体定位与描述..." /></div>
                  <div><Label>交通信息</Label><Textarea value={form.transportation || ""} onChange={(e) => setField("transportation", e.target.value)} rows={3} placeholder="步行可达地铁线路、通勤时间..." /></div>
                  <div><Label>附近学校</Label><Textarea value={form.schools || ""} onChange={(e) => setField("schools", e.target.value)} rows={2} placeholder="学区、附近学校..." /></div>
                  <div><Label>景观描述</Label><Textarea value={form.views_description || ""} onChange={(e) => setField("views_description", e.target.value)} rows={2} placeholder="水景、城市景观..." /></div>
                  <div><Label>建筑设计</Label><Textarea value={form.architecture || ""} onChange={(e) => setField("architecture", e.target.value)} rows={3} placeholder="建筑团队、结构、层高..." /></div>
                  <div><Label>室内设计</Label><Textarea value={form.interior_design || ""} onChange={(e) => setField("interior_design", e.target.value)} rows={3} placeholder="室内设计团队、风格..." /></div>
                  <div><Label>区域概况</Label><Textarea value={form.area_info || ""} onChange={(e) => setField("area_info", e.target.value)} rows={3} placeholder="所在区域的定位与逻辑..." /></div>
                  <div><Label>投资分析</Label><Textarea value={form.investment_info || ""} onChange={(e) => setField("investment_info", e.target.value)} rows={3} placeholder="租售比、投资逻辑..." /></div>
                  <div><Label>适合人群</Label><Textarea value={form.target_buyers || ""} onChange={(e) => setField("target_buyers", e.target.value)} rows={2} placeholder="目标客户群体..." /></div>
                  <div><Label>总结</Label><Textarea value={form.summary || ""} onChange={(e) => setField("summary", e.target.value)} rows={2} placeholder="三句话总结..." /></div>
                </TabsContent>

                {/* Tab 3: Units, Highlights, Amenities */}
                <TabsContent value="units" className="space-y-4 mt-3">
                  {/* Highlights */}
                  <div>
                    <Label>项目亮点</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={newHighlight} onChange={(e) => setNewHighlight(e.target.value)} placeholder="添加亮点..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHighlight())} />
                      <Button variant="outline" size="sm" onClick={addHighlight}><Plus className="w-3 h-3" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(form.highlights_list || []).map((h, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {h}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => setForm((f) => ({ ...f, highlights_list: f.highlights_list?.filter((_, j) => j !== i) }))} />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Amenities */}
                  <div>
                    <Label>配套设施</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)} placeholder="添加设施..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity())} />
                      <Button variant="outline" size="sm" onClick={addAmenity}><Plus className="w-3 h-3" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(form.amenities_list || []).map((a, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {a}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => setForm((f) => ({ ...f, amenities_list: f.amenities_list?.filter((_, j) => j !== i) }))} />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Unit Types */}
                  <div>
                    <Label>户型价格表</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={newUnitType} onChange={(e) => setNewUnitType(e.target.value)} placeholder="户型 (e.g. Studio)" className="flex-1" />
                      <Input value={newUnitPrice} onChange={(e) => setNewUnitPrice(e.target.value)} placeholder="价格 (e.g. $650,000起)" className="flex-1" />
                      <Button variant="outline" size="sm" onClick={addUnitType}><Plus className="w-3 h-3" /></Button>
                    </div>
                    {(form.unit_types_list || []).length > 0 && (
                      <div className="mt-2 rounded-md border text-sm">
                        {(form.unit_types_list || []).map((u, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 border-b last:border-0">
                            <span><strong>{u.type}</strong> — {u.price}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setForm((f) => ({ ...f, unit_types_list: f.unit_types_list?.filter((_, j) => j !== i) }))}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {step === "review" && (
              <Button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending} className="w-full mt-4">
                {saveMutation.isPending ? "保存中..." : <><Check className="w-4 h-4 mr-2" />{editId ? "更新" : "确认发布"}</>}
              </Button>
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
                <TableHead>标题</TableHead><TableHead>区域</TableHead><TableHead>价格</TableHead>
                <TableHead>类型</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{l.title}</TableCell>
                  <TableCell>{l.area}</TableCell>
                  <TableCell>{l.price ? `$${Number(l.price).toLocaleString()}` : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{l.listing_type}</Badge></TableCell>
                  <TableCell><Badge variant={l.status === "active" ? "default" : "secondary"}>{l.status}</Badge></TableCell>
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
