import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "John",
    surname: "Doe",
    email: "john.doe@example.com",
    phone: "+1234567890",
    website: "https://example-store.com",
  });

  // ElevenLabs Agent ID
  const AGENT_ID = "agent_1501ka3t4v8zffm8gznw3tnwyfpt";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create the lead in the database
      const { data: lead, error } = await supabase
        .from("leads")
        .insert([
          {
            ...formData,
            status: "new",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Lead Created!",
        description: "Ready to start AI voice call...",
      });

      setCurrentLeadId(lead.id);
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

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">First Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="surname">Last Name</Label>
                <Input
                  id="surname"
                  value={formData.surname}
                  onChange={(e) =>
                    setFormData({ ...formData, surname: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary shadow-elevated"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating Lead...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Trigger AI Call
                </>
              )}
            </Button>
          </form>
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