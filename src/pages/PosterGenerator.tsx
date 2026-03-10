import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Image as ImageIcon, Sparkles, PartyPopper } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

type PosterType = "marketing" | "sold";

export default function PosterGenerator() {
  const { profile } = useAuth();
  const posterRef = useRef<HTMLDivElement>(null);
  const [listingId, setListingId] = useState("");
  const [posterType, setPosterType] = useState<PosterType>("marketing");
  const [customTag, setCustomTag] = useState("");

  const { data: listings = [] } = useQuery({
    queryKey: ["listings-poster"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("id, title, address, price, area, cover_image, beds, baths, property_type");
      return data || [];
    },
  });

  const listing = listings.find((l) => l.id === listingId);

  const downloadPoster = async () => {
    if (!posterRef.current) return;
    try {
      const dataUrl = await toPng(posterRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.download = `${posterType}-${listing?.title || "poster"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Poster downloaded!");
    } catch {
      toast.error("Failed to generate poster");
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "Contact for price";
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Poster Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">Create marketing posters and deal celebration announcements</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card>
          <CardHeader><CardTitle className="text-base">Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Poster Type</label>
              <Select value={posterType} onValueChange={(v) => setPosterType(v as PosterType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">📢 Marketing Poster</SelectItem>
                  <SelectItem value="sold">🎉 Deal Celebration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Select Listing</label>
              <Select value={listingId} onValueChange={setListingId}>
                <SelectTrigger><SelectValue placeholder="Choose a listing" /></SelectTrigger>
                <SelectContent>
                  {listings.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Custom Tagline (optional)</label>
              <Input value={customTag} onChange={(e) => setCustomTag(e.target.value)} placeholder="e.g. Limited time offer!" />
            </div>
            <Button onClick={downloadPoster} disabled={!listing} className="w-full">
              <Download className="w-4 h-4 mr-2" />Download Poster
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader><CardTitle className="text-base">Preview</CardTitle></CardHeader>
          <CardContent>
            {!listing ? (
              <div className="h-[500px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
                <p className="text-muted-foreground text-sm">Select a listing to preview</p>
              </div>
            ) : (
              <div ref={posterRef} className="relative overflow-hidden rounded-lg" style={{ width: 400, minHeight: 560 }}>
                {posterType === "sold" ? (
                  /* SOLD / Deal celebration */
                  <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white p-6 flex flex-col" style={{ minHeight: 560 }}>
                    <div className="text-center mb-4">
                      <PartyPopper className="w-10 h-10 mx-auto mb-2 text-yellow-200" />
                      <h2 className="text-3xl font-black tracking-tight">JUST SOLD!</h2>
                      {customTag && <p className="text-sm mt-1 text-yellow-100">{customTag}</p>}
                    </div>
                    {listing.cover_image && (
                      <div className="rounded-lg overflow-hidden mb-4 shadow-lg">
                        <img src={listing.cover_image} alt="" className="w-full h-48 object-cover" crossOrigin="anonymous" />
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-1">{listing.title}</h3>
                    <p className="text-sm text-yellow-100 mb-2">{listing.address || listing.area}</p>
                    <p className="text-2xl font-black mb-4">{formatPrice(listing.price)}</p>
                    <div className="mt-auto pt-4 border-t border-white/20">
                      <p className="text-xs text-yellow-100 mb-1">Your Agent</p>
                      <p className="font-bold text-lg">{profile?.name}</p>
                      {profile?.phone && <p className="text-sm text-yellow-100">{profile.phone}</p>}
                      {profile?.email && <p className="text-sm text-yellow-100">{profile.email}</p>}
                      {profile?.wechat && <p className="text-sm text-yellow-100">WeChat: {profile.wechat}</p>}
                    </div>
                  </div>
                ) : (
                  /* Marketing poster */
                  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 flex flex-col" style={{ minHeight: 560 }}>
                    <div className="text-center mb-4">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                      <h2 className="text-2xl font-black tracking-tight uppercase">Featured Listing</h2>
                      {customTag && <p className="text-sm mt-1 text-amber-300">{customTag}</p>}
                    </div>
                    {listing.cover_image && (
                      <div className="rounded-lg overflow-hidden mb-4 shadow-lg">
                        <img src={listing.cover_image} alt="" className="w-full h-48 object-cover" crossOrigin="anonymous" />
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-1">{listing.title}</h3>
                    <p className="text-sm text-slate-400 mb-2">{listing.address || listing.area}</p>
                    <p className="text-2xl font-black text-amber-400 mb-2">{formatPrice(listing.price)}</p>
                    <div className="flex gap-4 text-sm text-slate-300 mb-4">
                      {listing.beds && <span>{listing.beds} Beds</span>}
                      {listing.baths && <span>{listing.baths} Baths</span>}
                      {listing.property_type && <span>{listing.property_type}</span>}
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-700">
                      <p className="text-xs text-slate-500 mb-1">Presented by</p>
                      <p className="font-bold text-lg">{profile?.name}</p>
                      {profile?.phone && <p className="text-sm text-slate-400">{profile.phone}</p>}
                      {profile?.email && <p className="text-sm text-slate-400">{profile.email}</p>}
                      {profile?.wechat && <p className="text-sm text-slate-400">WeChat: {profile.wechat}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
