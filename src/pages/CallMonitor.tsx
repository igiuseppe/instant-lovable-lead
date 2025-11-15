import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { VoiceCallHandler } from "@/components/VoiceCallHandler";
import { ArrowLeft, Loader2 } from "lucide-react";

const CallMonitor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const AGENT_ID = "agent_1501ka3t4v8zffm8gznw3tnwyfpt";

  useEffect(() => {
    if (id) {
      fetchLead();
      subscribeToLead();
    }
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

  const subscribeToLead = () => {
    const channel = supabase
      .channel(`lead-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: `id=eq.${id}`
        },
        (payload) => {
          setLead(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCallComplete = () => {
    toast({
      title: "Call Completed",
      description: "The AI qualification call has ended.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <h2 className="text-xl font-semibold">Lead Not Found</h2>
          <Button onClick={() => navigate("/")} className="mt-4">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-surface p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Live Call Monitor
          </h1>
          <p className="text-muted-foreground">
            {lead.name} {lead.surname} • {lead.email}
          </p>
        </div>

        {/* Voice Call Handler */}
        <VoiceCallHandler 
          leadId={lead.id} 
          agentId={AGENT_ID}
          onComplete={handleCallComplete}
        />

        {/* Lead Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Contact Details</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Phone:</span> {lead.phone}</p>
              <p><span className="text-muted-foreground">Email:</span> {lead.email}</p>
              {lead.website && (
                <p><span className="text-muted-foreground">Website:</span> {lead.website}</p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-2">Call Status</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Status:</span> {lead.status}</p>
              {lead.call_started_at && (
                <p><span className="text-muted-foreground">Started:</span> {new Date(lead.call_started_at).toLocaleString()}</p>
              )}
              {lead.call_ended_at && (
                <p><span className="text-muted-foreground">Ended:</span> {new Date(lead.call_ended_at).toLocaleString()}</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CallMonitor;
