import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2, Users, LayoutDashboard, Bell, Settings, LogOut,
  Menu, X, Shield, UserCircle, CalendarDays, BookOpen
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function AppLayout() {
  const { profile, signOut, isPM, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/listings", icon: Building2, label: "Listings" },
    ...(isPM ? [{ to: "/admin/listings", icon: Shield, label: "Manage Listings" }] : []),
    ...(!isPM ? [{ to: "/clients", icon: Users, label: "My Clients" }] : []),
    { to: "/notifications", icon: Bell, label: "Notifications", badge: unreadCount },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="text-lg font-bold font-display text-sidebar-accent-foreground tracking-tight">
          ACRE
        </h1>
        <p className="text-xs text-sidebar-foreground mt-0.5">Real Estate Platform</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
            {item.badge ? (
              <Badge variant="destructive" className="ml-auto text-[10px] h-5 min-w-5 flex items-center justify-center">
                {item.badge}
              </Badge>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
            {profile?.name || profile?.email}
          </p>
          <p className="text-xs text-sidebar-foreground capitalize">{profile?.role}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold font-display text-sidebar-accent-foreground">ACRE</h1>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-sidebar">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-14">
        <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
