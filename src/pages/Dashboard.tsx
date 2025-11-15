import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Phone, Clock, CheckCircle2, XCircle, Activity, PhoneCall } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Lead {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  website: string | null;
  status: string;
  qualification_result: string | null;
  qualification_score: number | null;
  created_at: string;
  call_started_at: string | null;
  call_ended_at: string | null;
}

const Dashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState({ total: 0, qualified: 0, calling: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeads();
    subscribeToLeads();
  }, []);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setLeads(data);
      calculateStats(data);
    }
  };

  const calculateStats = (data: Lead[]) => {
    setStats({
      total: data.length,
      qualified: data.filter(l => l.qualification_score !== null && l.qualification_score >= 70).length,
      calling: data.filter(l => l.status === 'calling').length,
    });
  };

  const subscribeToLeads = () => {
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, class: string }> = {
      new: { variant: "secondary", icon: Activity, class: "bg-muted" },
      calling: { variant: "default", icon: Phone, class: "bg-warning animate-pulse-soft" },
      call_completed: { variant: "outline", icon: Clock, class: "bg-accent/10" },
      qualified: { variant: "default", icon: CheckCircle2, class: "bg-success" },
      not_qualified: { variant: "destructive", icon: XCircle, class: "" },
    };

    const config = styles[status] || styles.new;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.class}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen gradient-surface p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              QualifAI
            </h1>
            <p className="text-muted-foreground mt-1">
              Instant lead qualification with AI voice agents
            </p>
          </div>
          <Button 
            onClick={() => navigate('/trigger')}
            className="gradient-primary shadow-elevated"
          >
            Simulate Inbound Lead
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 shadow-card border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Calls</p>
                <p className="text-3xl font-bold mt-1">{stats.calling}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Phone className="w-6 h-6 text-warning animate-pulse-soft" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Qualified</p>
                <p className="text-3xl font-bold mt-1">{stats.qualified}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
            </div>
          </Card>
        </div>

        {/* Leads Table */}
        <Card className="shadow-elevated border-border/50">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold">Recent Leads</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/lead/${lead.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="font-medium">{lead.name} {lead.surname}</div>
                        <div className="text-sm text-muted-foreground">{lead.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.qualification_score !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="relative w-12 h-12">
                            <svg className="w-12 h-12 transform -rotate-90">
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                                className="text-muted"
                              />
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 20}`}
                                strokeDashoffset={`${2 * Math.PI * 20 * (1 - lead.qualification_score / 100)}`}
                                className={
                                  lead.qualification_score >= 70 ? 'text-green-500' :
                                  lead.qualification_score >= 40 ? 'text-yellow-500' :
                                  'text-red-500'
                                }
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                              {lead.qualification_score}
                            </span>
                          </div>
                          <span className="text-sm font-medium">/100</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {lead.status === 'new' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/trigger?leadId=${lead.id}`);
                            }}
                            className="gap-2"
                          >
                            <PhoneCall className="w-4 h-4" />
                            Call
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/lead/${lead.id}`);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leads.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No leads yet. Simulate an inbound lead to get started!</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;