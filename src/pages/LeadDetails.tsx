import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Lightbulb,
  FileText,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface Lead {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  website: string | null;
  status: string;
  created_at: string;
  call_started_at: string | null;
  call_ended_at: string | null;
  call_duration_seconds: number | null;
  current_platform: string | null;
  monthly_traffic: number | null;
  monthly_orders: number | null;
  improvement_areas: string[] | null;
  implementation_timeline: string | null;
  call_summary: string | null;
  key_insights: string[] | null;
  objections: string[] | null;
  qualification_result: string | null;
  qualification_score: number | null;
  next_actions: string[] | null;
  meeting_scheduled: boolean;
  meeting_datetime: string | null;
  transcript: string | null;
}

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLead();
    subscribeToUpdates();
  }, [id]);

  const fetchLead = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setLead(data);
    }
    setLoading(false);
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`lead-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setLead(payload.new as Lead);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen gradient-surface flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Lead Not Found</h2>
          <Button onClick={() => navigate("/")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-muted",
      calling: "bg-warning animate-pulse-soft",
      call_completed: "bg-accent",
      qualified: "bg-success",
      not_qualified: "bg-destructive",
    };
    return colors[status] || "bg-muted";
  };

  return (
    <div className="min-h-screen gradient-surface p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <Card className="shadow-elevated border-border/50 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white text-2xl font-bold">
                {lead.name[0]}
                {lead.surname[0]}
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {lead.name} {lead.surname}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {lead.email}
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {lead.phone}
                  </div>
                  {lead.website && (
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        Website
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Badge className={getStatusColor(lead.status)}>
              {lead.status.replace("_", " ")}
            </Badge>
          </div>
        </Card>

        {/* Qualification Score */}
        {lead.qualification_score !== null && (
          <Card className="shadow-card border-border/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-2">
                  Qualification Score
                </h2>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold">
                    {lead.qualification_score}%
                  </div>
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      lead.qualification_score >= 70
                        ? "bg-success/10 text-success"
                        : lead.qualification_score >= 40
                        ? "bg-warning/10 text-warning"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {lead.qualification_result || "Pending"}
                  </div>
                </div>
              </div>
              <TrendingUp
                className={`w-16 h-16 ${
                  lead.qualification_score >= 70
                    ? "text-success"
                    : "text-muted-foreground"
                }`}
              />
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Call Information */}
          {lead.call_started_at && (
            <Card className="shadow-card border-border/50 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Call Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Started</p>
                  <p className="font-medium">
                    {format(
                      new Date(lead.call_started_at),
                      "PPpp"
                    )}
                  </p>
                </div>
                {lead.call_ended_at && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Ended</p>
                      <p className="font-medium">
                        {format(
                          new Date(lead.call_ended_at),
                          "PPpp"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">
                        {Math.floor((lead.call_duration_seconds || 0) / 60)}m{" "}
                        {(lead.call_duration_seconds || 0) % 60}s
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* Prospect Details */}
          {(lead.current_platform ||
            lead.monthly_traffic ||
            lead.monthly_orders) && (
            <Card className="shadow-card border-border/50 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Prospect Details
              </h2>
              <div className="space-y-3">
                {lead.current_platform && (
                  <div>
                    <p className="text-sm text-muted-foreground">Platform</p>
                    <p className="font-medium">{lead.current_platform}</p>
                  </div>
                )}
                {lead.monthly_traffic && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Monthly Traffic
                    </p>
                    <p className="font-medium">
                      {lead.monthly_traffic.toLocaleString()} visits
                    </p>
                  </div>
                )}
                {lead.monthly_orders && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Monthly Orders
                    </p>
                    <p className="font-medium">
                      {lead.monthly_orders.toLocaleString()} orders
                    </p>
                  </div>
                )}
                {lead.implementation_timeline && (
                  <div>
                    <p className="text-sm text-muted-foreground">Timeline</p>
                    <p className="font-medium">{lead.implementation_timeline}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Call Summary */}
        {lead.call_summary && (
          <Card className="shadow-card border-border/50 p-6">
            <h2 className="text-lg font-semibold mb-4">Call Summary</h2>
            <p className="text-foreground leading-relaxed">{lead.call_summary}</p>
          </Card>
        )}

        {/* Transcript */}
        {lead.transcript && (
          <Card className="shadow-card border-border/50 p-6">
            <div className="flex items-start gap-3 mb-4">
              <FileText className="w-5 h-5 text-primary mt-1" />
              <div>
                <h2 className="text-xl font-semibold">Call Transcript</h2>
                <p className="text-sm text-muted-foreground">Full conversation recording</p>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">{lead.transcript}</pre>
            </div>
          </Card>
        )}

        {/* Key Insights */}
        {lead.key_insights && lead.key_insights.length > 0 && (
          <Card className="shadow-card border-border/50 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-warning" />
              Key Insights
            </h2>
            <ul className="space-y-2">
              {lead.key_insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Objections */}
        {lead.objections && lead.objections.length > 0 && (
          <Card className="shadow-card border-border/50 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Objections Raised
            </h2>
            <ul className="space-y-2">
              {lead.objections.map((objection, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                  <span>{objection}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Next Actions */}
        {lead.next_actions && lead.next_actions.length > 0 && (
          <Card className="shadow-card border-border/50 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Recommended Next Actions
            </h2>
            <ul className="space-y-2">
              {lead.next_actions.map((action, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-medium text-accent">
                      {index + 1}
                    </span>
                  </div>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Meeting Info */}
        {lead.meeting_scheduled && lead.meeting_datetime && (
          <Card className="shadow-card border-success/20 border-2 p-6 bg-success/5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-success" />
              Meeting Scheduled
            </h2>
            <p className="text-lg font-medium">
              {format(new Date(lead.meeting_datetime), "PPPP 'at' p")}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LeadDetails;