import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Phone, Mail, MessageSquare, Play, FileDown, Building, ShieldCheck, Banknote, Briefcase, Truck, Wrench, HelpCircle } from "lucide-react";

const vendorCategoryLabels: Record<string, string> = {
  insurance: "Insurance", mortgage: "Mortgage", inspector: "Inspector",
  lawyer: "Lawyer", moving: "Moving", contractor: "Contractor", other: "Other",
};
const vendorCategoryIcons: Record<string, any> = {
  insurance: ShieldCheck, mortgage: Banknote, inspector: Search,
  lawyer: Briefcase, moving: Truck, contractor: Wrench, other: HelpCircle,
};
const videoCategoryLabels: Record<string, string> = {
  system: "System", sales: "Sales", market: "Market", compliance: "Compliance", general: "General",
};
const docCategoryLabels: Record<string, string> = {
  business_card_template: "Business Card", contract: "Contract",
  brand_kit: "Brand Kit", guide: "Guide", general: "General",
};

export default function Resources() {
  const { user } = useAuth();
  const [globalSearch, setGlobalSearch] = useState("");

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").order("category").order("name");
      return data ?? [];
    },
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["training-videos"],
    queryFn: async () => {
      const { data } = await supabase.from("training_videos").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["resource-documents"],
    queryFn: async () => {
      const { data } = await supabase.from("resource_documents").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["video-progress", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("video_progress").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Global search filter
  const q = globalSearch.toLowerCase();
  const filteredVendors = q ? vendors.filter((v: any) => v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q) || v.specialties?.toLowerCase().includes(q)) : vendors;
  const filteredVideos = q ? videos.filter((v: any) => v.title.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)) : videos;
  const filteredDocs = q ? documents.filter((d: any) => d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)) : documents;

  const getVideoProgress = (videoId: string) => progress.find((p: any) => p.video_id === videoId);

  // Group vendors by category
  const vendorsByCategory = Object.entries(vendorCategoryLabels).map(([key, label]) => ({
    key,
    label,
    Icon: vendorCategoryIcons[key],
    items: filteredVendors.filter((v: any) => v.category === key),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <h1 className="text-2xl font-bold font-display mb-4">Resources & Training</h1>

      {/* Global Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search vendors, videos, documents..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="pl-9 text-base"
        />
      </div>

      <Tabs defaultValue="vendors">
        <TabsList className="mb-4">
          <TabsTrigger value="vendors" className="gap-1"><Building className="w-3 h-3" />Vendors ({filteredVendors.length})</TabsTrigger>
          <TabsTrigger value="videos" className="gap-1"><Play className="w-3 h-3" />Video Academy ({filteredVideos.length})</TabsTrigger>
          <TabsTrigger value="docs" className="gap-1"><FileDown className="w-3 h-3" />Documents ({filteredDocs.length})</TabsTrigger>
        </TabsList>

        {/* Vendors */}
        <TabsContent value="vendors">
          {vendorsByCategory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No vendors found</div>
          ) : (
            <div className="space-y-6">
              {vendorsByCategory.map((group) => (
                <div key={group.key}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <group.Icon className="w-4 h-4" />{group.label}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.items.map((vendor: any) => (
                      <Card key={vendor.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {vendor.logo_url ? (
                                <img src={vendor.logo_url} alt={vendor.name} className="w-full h-full object-cover" />
                              ) : (
                                <group.Icon className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm">{vendor.name}</h4>
                              {vendor.specialties && <p className="text-xs text-muted-foreground mt-0.5">{vendor.specialties}</p>}
                              {vendor.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{vendor.description}</p>}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {vendor.phone && (
                                  <a href={`tel:${vendor.phone}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                                    <Phone className="w-3 h-3" />{vendor.phone}
                                  </a>
                                )}
                                {vendor.email && (
                                  <a href={`mailto:${vendor.email}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                                    <Mail className="w-3 h-3" />{vendor.email}
                                  </a>
                                )}
                                {vendor.wechat_qr_url && (
                                  <span className="text-xs text-primary flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" />WeChat QR
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Videos */}
        <TabsContent value="videos">
          {filteredVideos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No training videos found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video: any) => {
                const prog = getVideoProgress(video.id);
                return (
                  <Card key={video.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted relative flex items-center justify-center">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <Play className="w-10 h-10 text-muted-foreground" />
                      )}
                      {prog?.completed && (
                        <Badge className="absolute top-2 right-2 bg-emerald-500">Completed</Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate flex-1">{video.title}</h4>
                        <Badge variant="outline" className="text-[10px]">{videoCategoryLabels[video.category]}</Badge>
                      </div>
                      {video.description && <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>}
                      <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                        <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                          <Play className="w-3 h-3 mr-1" />Watch
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Documents */}
        <TabsContent value="docs">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No documents found</div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc: any) => (
                <Card key={doc.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <FileDown className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{doc.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{docCategoryLabels[doc.category]}</Badge>
                        {doc.description && <span className="text-xs text-muted-foreground truncate">{doc.description}</span>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                        <FileDown className="w-3 h-3 mr-1" />Download
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
