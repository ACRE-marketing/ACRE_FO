import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function TeamDashboard() {
  // Get all agents
  const { data: agents = [] } = useQuery({
    queryKey: ["team-agents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, phone")
        .eq("role", "agent");
      return data || [];
    },
  });

  // Get all clients (PM can view via RLS)
  const { data: clients = [] } = useQuery({
    queryKey: ["team-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name, agent_id, stage, next_followup_date, last_contact_at, created_at");
      return data || [];
    },
  });

  const today = new Date();

  const agentStats = agents.map((agent) => {
    const agentClients = clients.filter((c) => c.agent_id === agent.id);
    const active = agentClients.filter((c) => c.stage === "active").length;
    const overdue = agentClients.filter((c) => {
      if (!c.next_followup_date) return false;
      return new Date(c.next_followup_date) < today;
    });
    const totalClients = agentClients.length;

    return {
      ...agent,
      totalClients,
      active,
      overdueCount: overdue.length,
      overdueClients: overdue,
    };
  });

  // Sort by overdue count descending
  agentStats.sort((a, b) => b.overdueCount - a.overdueCount);

  const totalOverdue = agentStats.reduce((s, a) => s + a.overdueCount, 0);
  const totalClients = clients.length;
  const totalActive = clients.filter((c) => c.stage === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Team Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of all agents' client management performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Agents</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-2xl font-bold font-display">{agents.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Clients</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-display">{totalClients}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Clients</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-2xl font-bold font-display">{totalActive}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overdue Follow-ups</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-2xl font-bold font-display text-destructive">{totalOverdue}</span>
          </CardContent>
        </Card>
      </div>

      {/* Agent overview */}
      <Card>
        <CardHeader><CardTitle className="text-base">Agent Performance</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Total Clients</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentStats.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{agent.email || agent.phone}</TableCell>
                  <TableCell>{agent.totalClients}</TableCell>
                  <TableCell>{agent.active}</TableCell>
                  <TableCell>
                    {agent.overdueCount > 0 ? (
                      <Badge variant="destructive">{agent.overdueCount} overdue</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">On track</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Overdue details */}
      {totalOverdue > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Overdue Follow-ups ({totalOverdue})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentStats.flatMap((agent) =>
                  agent.overdueClients.map((client) => {
                    const daysOverdue = differenceInDays(today, new Date(client.next_followup_date!));
                    return (
                      <TableRow key={client.id}>
                        <TableCell className="text-muted-foreground text-sm">{agent.name}</TableCell>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="text-xs">{format(new Date(client.next_followup_date!), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={daysOverdue > 7 ? "destructive" : "secondary"}>
                            {daysOverdue}d overdue
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
