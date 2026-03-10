import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Plus, BarChart3, ExternalLink, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function generateShortCode() {
  return Math.random().toString(36).substring(2, 8);
}

export default function TrackingLinks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [listingId, setListingId] = useState<string>("");
  const [selectedLink, setSelectedLink] = useState<string | null>(null);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["tracking-links", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_links")
        .select("*, listings(title)")
        .eq("agent_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["listings-for-links"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("id, title").eq("status", "active");
      return data || [];
    },
  });

  const { data: clicks = [] } = useQuery({
    queryKey: ["link-clicks", selectedLink],
    queryFn: async () => {
      const { data } = await supabase
        .from("link_clicks")
        .select("*")
        .eq("link_id", selectedLink!)
        .order("clicked_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!selectedLink,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tracking_links").insert({
        agent_id: user!.id,
        listing_id: listingId || null,
        short_code: generateShortCode(),
        title,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking-links"] });
      setOpen(false);
      setTitle("");
      setListingId("");
      toast.success("Tracking link created!");
    },
    onError: () => toast.error("Failed to create link"),
  });

  const getTrackingUrl = (code: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectId}.supabase.co/functions/v1/track-click?code=${code}`;
  };

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(getTrackingUrl(code));
    toast.success("Link copied!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Tracking Links</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate shareable links and track client engagement</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />New Link</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Tracking Link</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. WeChat group share" />
              </div>
              <div>
                <label className="text-sm font-medium">Linked Listing (optional)</label>
                <Select value={listingId} onValueChange={setListingId}>
                  <SelectTrigger><SelectValue placeholder="Select a listing" /></SelectTrigger>
                  <SelectContent>
                    {listings.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!title || createMutation.isPending} className="w-full">
                Create Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Links</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-display">{links.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Clicks</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-display">{links.reduce((s, l) => s + (l.click_count || 0), 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Clicks/Link</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">
              {links.length ? (links.reduce((s, l) => s + (l.click_count || 0), 0) / links.length).toFixed(1) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All Links</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tracking links yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Listing</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.title}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {(link.listings as any)?.title || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <MousePointerClick className="w-3 h-3" />{link.click_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(link.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => copyLink(link.short_code)}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedLink(selectedLink === link.id ? null : link.id)}>
                          <BarChart3 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedLink && (
        <Card>
          <CardHeader><CardTitle className="text-base">Click Details (Last 50)</CardTitle></CardHeader>
          <CardContent>
            {clicks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clicks yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Referrer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clicks.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">{format(new Date(c.clicked_at), "MMM d, HH:mm")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {c.user_agent?.includes("Mobile") ? "📱 Mobile" : "💻 Desktop"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {c.referer || "Direct"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
