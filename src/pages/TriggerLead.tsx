import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Sparkles } from "lucide-react";
import { VoiceCallHandler } from "@/components/VoiceCallHandler";

const TriggerLead = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const leadData = {
    name: "Lorenzo",
    surname: "Rossi",
    email: "lorenzo@example.com",
    phone: "+39123456789",
    website: "https://example.com",
  };

  // ElevenLabs Agent ID
  const AGENT_ID = "agent_1501ka3t4v8zffm8gznw3tnwyfpt";

  // Check if leadId is provided in URL params
  useEffect(() => {
    const leadId = searchParams.get('leadId');
    if (leadId) {
      setCurrentLeadId(leadId);
    }
  }, [searchParams]);

  const handleStartCall = async () => {
    setIsSubmitting(true);

    try {
      // Check if we have an existing lead ID
      const existingLeadId = searchParams.get('leadId');
      
      if (existingLeadId) {
        // Use existing lead
        setCurrentLeadId(existingLeadId);
        toast({
          title: "Starting Call",
          description: "Connecting to AI voice agent...",
        });
      } else {
        // Create new lead
        const { data: lead, error } = await supabase
          .from("leads")
          .insert([
            {
              ...leadData,
              status: "new",
            },
          ])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Lead Created!",
          description: "Starting AI voice call...",
        });

        setCurrentLeadId(lead.id);
      }
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Error",
        description: "Failed to create lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallComplete = () => {
    toast({
      title: "Call Completed!",
      description: "Returning to dashboard...",
    });
    setTimeout(() => {
      navigate("/");
    }, 1500);
  };

  return (
    <div className="min-h-screen gradient-surface p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="shadow-elevated border-border/50 overflow-hidden">
          <div className="gradient-primary p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Simulate Inbound Lead</h1>
                <p className="text-white/90 mt-1">
                  Trigger an AI voice qualification call
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{leadData.name} {leadData.surname}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{leadData.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{leadData.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Website</p>
                  <p className="font-medium">{leadData.website}</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleStartCall}
              className="w-full gradient-primary shadow-elevated"
              disabled={isSubmitting || currentLeadId !== null}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating Lead...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {currentLeadId ? "Call in Progress..." : "Trigger AI Call"}
                </>
              )}
            </Button>
          </div>
        </Card>

        {currentLeadId && (
          <VoiceCallHandler 
            leadId={currentLeadId}
            agentId={AGENT_ID}
            onComplete={handleCallComplete}
          />
        )}

        <Card className="p-4 bg-accent/10 border-accent/20">
          <div className="text-sm text-accent-foreground">
            <p className="font-medium mb-2">What happens next?</p>
            <ol className="list-decimal list-inside space-y-1 text-sm opacity-90">
              <li>Lead is created in the CRM</li>
              <li>Click "Start Call" to begin voice conversation</li>
              <li>AI agent conducts qualification interview</li>
              <li>CRM updates in real-time during call</li>
              <li>Call summary generated after completion</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TriggerLead;