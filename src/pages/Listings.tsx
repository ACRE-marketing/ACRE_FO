import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ListingCard from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export default function Listings() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings", search, typeFilter, areaFilter, tagFilter],
    queryFn: async () => {
      let q = supabase.from("listings").select("*").eq("status", "active").order("created_at", { ascending: false });
      if (search) q = q.or(`title.ilike.%${search}%,area.ilike.%${search}%`);
      if (typeFilter !== "all") q = q.eq("listing_type", typeFilter as any);
      if (areaFilter !== "all") q = q.eq("area", areaFilter as any);
      if (tagFilter !== "all") q = q.eq("promo_tag", tagFilter as any);
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold font-display mb-4">Listings</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="company_exclusive">Exclusive</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="agent_exclusive">Agent Exclusive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Area" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            <SelectItem value="Manhattan">Manhattan</SelectItem>
            <SelectItem value="LIC">LIC</SelectItem>
            <SelectItem value="Queens">Queens</SelectItem>
            <SelectItem value="Flushing">Flushing</SelectItem>
            <SelectItem value="Brooklyn">Brooklyn</SelectItem>
            <SelectItem value="Jersey City">Jersey City</SelectItem>
            <SelectItem value="Long Island">Long Island</SelectItem>
            <SelectItem value="Astoria">Astoria</SelectItem>
            <SelectItem value="Williamsburg">Williamsburg</SelectItem>
            <SelectItem value="Hoboken">Hoboken</SelectItem>
            <SelectItem value="Bronx">Bronx</SelectItem>
            <SelectItem value="Staten Island">Staten Island</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            <SelectItem value="limited_offer">Limited Offer</SelectItem>
            <SelectItem value="rare">Rare</SelectItem>
            <SelectItem value="new_development">New Dev</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No listings found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
