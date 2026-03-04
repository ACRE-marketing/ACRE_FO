import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, MapPin } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

const typeLabels: Record<string, string> = {
  company_exclusive: "Exclusive",
  featured: "Featured",
  agent_exclusive: "Agent Exclusive",
};

const tagLabels: Record<string, string> = {
  limited_offer: "Limited Offer",
  rare: "Rare",
  new_development: "New Dev",
};

const tagClasses: Record<string, string> = {
  limited_offer: "tag-limited",
  rare: "tag-rare",
  new_development: "tag-new-dev",
};

export default function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link to={`/listings/${listing.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all group cursor-pointer">
        <div className="aspect-[16/10] bg-muted relative overflow-hidden">
          {listing.cover_image ? (
            <img
              src={listing.cover_image}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <MapPin className="w-8 h-8" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1.5">
            <Badge variant="secondary" className="tag-exclusive text-[10px]">
              {typeLabels[listing.listing_type] || listing.listing_type}
            </Badge>
            {listing.promo_tag && (
              <Badge variant="secondary" className={`${tagClasses[listing.promo_tag] || ""} text-[10px]`}>
                {tagLabels[listing.promo_tag] || listing.promo_tag}
              </Badge>
            )}
          </div>
        </div>
        <CardContent className="p-3">
          <h3 className="font-semibold text-sm font-display text-foreground truncate">{listing.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {listing.area}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-bold text-foreground">
              {listing.price ? `$${Number(listing.price).toLocaleString()}` : "Price TBD"}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {listing.beds != null && (
                <span className="flex items-center gap-0.5"><Bed className="w-3 h-3" />{listing.beds}</span>
              )}
              {listing.baths != null && (
                <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{listing.baths}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
