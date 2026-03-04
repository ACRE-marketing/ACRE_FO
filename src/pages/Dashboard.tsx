import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Bell, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { profile, user, isPM } = useAuth();

  const { data: listingsCount = 0 } = useQuery({
    queryKey: ["listings-count"],
    queryFn: async () => {
      const { count } = await supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "active");
      return count ?? 0;
    },
  });

  const { data: clientsCount = 0 } = useQuery({
    queryKey: ["clients-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("clients").select("*", { count: "exact", head: true }).eq("agent_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user && !isPM,
  });

  const { data: unreadNotifs = 0 } = useQuery({
    queryKey: ["unread-count-dash", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("is_read", false);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: upcomingFollowups = 0 } = useQuery({
    queryKey: ["upcoming-followups", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", user!.id)
        .lte("next_followup_date", today);
      return count ?? 0;
    },
    enabled: !!user && !isPM,
  });

  const stats = [
    { label: "Active Listings", value: listingsCount, icon: Building2, to: "/listings", color: "text-primary" },
    ...(!isPM ? [
      { label: "My Clients", value: clientsCount, icon: Users, to: "/clients", color: "text-success" },
      { label: "Due Follow-ups", value: upcomingFollowups, icon: Clock, to: "/clients", color: "text-warning" },
    ] : []),
    { label: "Unread Notifications", value: unreadNotifs, icon: Bell, to: "/notifications", color: "text-destructive" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-foreground">
          Welcome back, {profile?.name || "User"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here's your overview for today
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
