import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Bed, Bath, MapPin, ExternalLink, Building2, Train,
  GraduationCap, Eye, Paintbrush, PenTool, TrendingUp, Users,
  CheckCircle2, Star, Calendar, Layers, Home,
} from "lucide-react";

const typeLabels: Record<string, string> = {
  company_exclusive: "Exclusive", featured: "Featured", agent_exclusive: "Agent Exclusive",
};
const tagLabels: Record<string, string> = {
  limited_offer: "Limited Offer", rare: "Rare", new_development: "New Development",
};

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-accent-foreground" />
        </div>
        <h2 className="text-lg font-bold font-display">{title}</h2>
      </div>
      <div className="pl-10 text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
        {children}
      </div>
    </div>
  );
}

function HighlightList({ items }: { items: string[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function UnitTypeTable({ units }: { units: Array<{ type: string; price: string }> }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Unit Type</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Price Range</th>
          </tr>
        </thead>
        <tbody>
          {units.map((u, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-2.5 font-medium">{u.type}</td>
              <td className="px-4 py-2.5">{u.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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

  const highlights = Array.isArray(listing.highlights) ? listing.highlights as string[] : [];
  const amenities = Array.isArray(listing.amenities) ? listing.amenities as string[] : [];
  const unitTypes = Array.isArray(listing.unit_types) ? listing.unit_types as Array<{ type: string; price: string }> : [];

  const hasDetails = listing.description || listing.transportation || listing.architecture || 
    listing.investment_info || highlights.length > 0 || amenities.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/listings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Listings
      </Link>

      {/* Hero Image */}
      <div className="aspect-[21/9] bg-muted rounded-xl overflow-hidden mb-6">
        {listing.cover_image ? (
          <img src={listing.cover_image} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Building2 className="w-16 h-16" /></div>
        )}
      </div>

      {/* Title Bar */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display">{listing.title}</h1>
          {listing.address && (
            <p className="text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-4 h-4" />{listing.address}</p>
          )}
          <p className="text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-4 h-4" />{listing.area}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge className="tag-exclusive">{typeLabels[listing.listing_type]}</Badge>
            {listing.promo_tag && <Badge className="tag-featured">{tagLabels[listing.promo_tag]}</Badge>}
            <Badge variant={listing.status === "active" ? "default" : "secondary"}>{listing.status}</Badge>
          </div>
        </div>
        <Card className="md:min-w-[260px]">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Price</p>
              <p className="text-2xl font-bold font-display">{listing.price ? `$${Number(listing.price).toLocaleString()}` : "TBD"}</p>
            </div>
            <div className="flex gap-6">
              {listing.beds != null && (
                <div className="flex items-center gap-1.5 text-sm"><Bed className="w-4 h-4 text-muted-foreground" /><span className="font-semibold">{listing.beds}</span> Beds</div>
              )}
              {listing.baths != null && (
                <div className="flex items-center gap-1.5 text-sm"><Bath className="w-4 h-4 text-muted-foreground" /><span className="font-semibold">{listing.baths}</span> Baths</div>
              )}
            </div>
            {listing.source_url && (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href={listing.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-2" /> View Source
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      {(listing.property_type || listing.sponsor || listing.total_floors || listing.total_units || listing.completion_date) && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-sm">
              {listing.property_type && (
                <div><p className="text-xs text-muted-foreground mb-0.5">Property Type</p><p className="font-semibold flex items-center gap-1"><Home className="w-3 h-3" />{listing.property_type}</p></div>
              )}
              {listing.sponsor && (
                <div><p className="text-xs text-muted-foreground mb-0.5">Sponsor</p><p className="font-semibold">{listing.sponsor}</p></div>
              )}
              {listing.total_floors && (
                <div><p className="text-xs text-muted-foreground mb-0.5">Floors</p><p className="font-semibold flex items-center gap-1"><Layers className="w-3 h-3" />{listing.total_floors}</p></div>
              )}
              {listing.total_units && (
                <div><p className="text-xs text-muted-foreground mb-0.5">Total Units</p><p className="font-semibold">{listing.total_units}</p></div>
              )}
              {listing.completion_date && (
                <div><p className="text-xs text-muted-foreground mb-0.5">Completion</p><p className="font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" />{listing.completion_date}</p></div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Sections */}
      {hasDetails && (
        <div className="space-y-8 mb-8">
          {listing.description && (
            <Section icon={Star} title="Project Overview">
              {listing.description}
            </Section>
          )}

          <Separator />

          {highlights.length > 0 && (
            <>
              <Section icon={CheckCircle2} title="Key Highlights">
                <HighlightList items={highlights} />
              </Section>
              <Separator />
            </>
          )}

          {listing.transportation && (
            <>
              <Section icon={Train} title="Transportation">
                {listing.transportation}
              </Section>
              <Separator />
            </>
          )}

          {listing.schools && (
            <>
              <Section icon={GraduationCap} title="Nearby Schools">
                {listing.schools}
              </Section>
              <Separator />
            </>
          )}

          {listing.views_description && (
            <>
              <Section icon={Eye} title="Views & Scenery">
                {listing.views_description}
              </Section>
              <Separator />
            </>
          )}

          {listing.architecture && (
            <>
              <Section icon={Building2} title="Architecture & Design">
                {listing.architecture}
              </Section>
              <Separator />
            </>
          )}

          {listing.interior_design && (
            <>
              <Section icon={PenTool} title="Interior Design">
                {listing.interior_design}
              </Section>
              <Separator />
            </>
          )}

          {unitTypes.length > 0 && (
            <>
              <Section icon={Layers} title="Unit Types & Pricing">
                <UnitTypeTable units={unitTypes} />
              </Section>
              <Separator />
            </>
          )}

          {amenities.length > 0 && (
            <>
              <Section icon={Paintbrush} title="Amenities">
                <HighlightList items={amenities} />
              </Section>
              <Separator />
            </>
          )}

          {listing.area_info && (
            <>
              <Section icon={MapPin} title="Area Overview">
                {listing.area_info}
              </Section>
              <Separator />
            </>
          )}

          {listing.investment_info && (
            <>
              <Section icon={TrendingUp} title="Investment Analysis">
                {listing.investment_info}
              </Section>
              <Separator />
            </>
          )}

          {listing.target_buyers && (
            <Section icon={Users} title="Target Buyers">
              {listing.target_buyers}
            </Section>
          )}

          {listing.summary && (
            <>
              <Separator />
              <Card className="bg-accent/30 border-accent">
                <CardContent className="p-5">
                  <p className="text-sm font-medium leading-relaxed">{listing.summary}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
