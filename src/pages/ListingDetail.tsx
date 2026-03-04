import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Bed, Bath, MapPin, ExternalLink } from "lucide-react";

const typeLabels: Record<string, string> = {
  company_exclusive: "Exclusive",
  featured: "Featured",
  agent_exclusive: "Agent Exclusive",
};
const tagLabels: Record<string, string> = {
  limited_offer: "Limited Offer",
  rare: "Rare",
  new_development: "New Development",
};

export default function ListingDetail() {
  const { id } = useParams();

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!listing) return <div className="text-center py-16 text-muted-foreground">Listing not found</div>;

  return (
    <div>
      <Link to="/listings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Listings
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4">
            {listing.cover_image ? (
              <img src={listing.cover_image} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground"><MapPin className="w-12 h-12" /></div>
            )}
          </div>
          <h1 className="text-2xl font-bold font-display">{listing.title}</h1>
          <p className="text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-4 h-4" />{listing.area}</p>

          <div className="flex gap-2 mt-3">
            <Badge className="tag-exclusive">{typeLabels[listing.listing_type]}</Badge>
            {listing.promo_tag && <Badge className="tag-featured">{tagLabels[listing.promo_tag]}</Badge>}
            <Badge variant={listing.status === "active" ? "default" : "secondary"}>{listing.status}</Badge>
          </div>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="text-2xl font-bold font-display">{listing.price ? `$${Number(listing.price).toLocaleString()}` : "TBD"}</p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Beds</p>
                <p className="text-lg font-semibold flex items-center gap-1"><Bed className="w-4 h-4" />{listing.beds ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Baths</p>
                <p className="text-lg font-semibold flex items-center gap-1"><Bath className="w-4 h-4" />{listing.baths ?? "—"}</p>
              </div>
            </div>
            {listing.source_url && (
              <Button variant="outline" className="w-full" asChild>
                <a href={listing.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" /> View Source
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
