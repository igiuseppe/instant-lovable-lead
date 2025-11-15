import { useConversation } from '@11labs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceCallHandlerProps {
  leadId: string;
  agentId: string;
  onComplete: () => void;
}

export function VoiceCallHandler({ leadId, agentId, onComplete }: VoiceCallHandlerProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const conversation = useConversation({
    onConnect: async () => {
      console.log('Call connected');
      await supabase.from('leads').update({
        status: 'calling',
        call_started_at: new Date().toISOString()
      }).eq('id', leadId);
    },
    onDisconnect: async () => {
      console.log('Call ended');
      await supabase.from('leads').update({
        status: 'call_completed',
        call_ended_at: new Date().toISOString()
      }).eq('id', leadId);
      onComplete();
    },
    onMessage: (message) => {
      console.log('Message:', message);
      setTranscript(prev => [...prev, JSON.stringify(message)]);
    },
    onError: (error) => {
      console.error('Call error:', error);
    },
    // Client tools allow ElevenLabs to update our CRM in real-time
    clientTools: {
      updateLeadStatus: async (params: { status: string; data?: any }) => {
        console.log('Updating lead status:', params);
        await supabase.from('leads').update({
          status: params.status,
          ...params.data
        }).eq('id', leadId);
        return "Status updated successfully";
      },
      scheduleDemo: async (params: { datetime: string }) => {
        console.log('Scheduling demo:', params);
        await supabase.from('leads').update({
          meeting_scheduled: true,
          meeting_datetime: params.datetime
        }).eq('id', leadId);
        return "Demo scheduled successfully";
      },
      saveCallSummary: async (params: { summary: string; insights?: string[]; objections?: string[]; next_actions?: string[] }) => {
        console.log('Saving call summary:', params);
        await supabase.from('leads').update({
          call_summary: params.summary,
          key_insights: params.insights,
          objections: params.objections,
          next_actions: params.next_actions
        }).eq('id', leadId);
        return "Summary saved successfully";
      }
    }
  });

  const startCall = async () => {
    try {
      // Request microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get signed URL from edge function
      const { data, error } = await supabase.functions.invoke('get-agent-url', {
        body: { agentId }
      });

      if (error) throw error;
      
      // Start conversation with signed URL
      await conversation.startSession({ 
        signedUrl: data.signedUrl
      });
      
      setIsStarted(true);
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  const endCall = async () => {
    await conversation.endSession();
    setIsStarted(false);
    
    // Process the transcript
    if (transcript.length > 0) {
      setIsProcessing(true);
      try {
        const fullTranscript = transcript.join('\n');
        const { data, error } = await supabase.functions.invoke('process-transcript', {
          body: { leadId, transcript: fullTranscript }
        });
        
        if (error) {
          console.error('Error processing transcript:', error);
          toast({
            title: "Processing Error",
            description: "Failed to process call transcript",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Call Processed",
            description: "Call transcript has been analyzed successfully",
          });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsProcessing(false);
      }
    }
    
    onComplete();
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Voice Call</h3>
          <p className="text-sm text-muted-foreground">
            {conversation.status === 'connected' ? 'Call in progress...' : 'Ready to start call'}
          </p>
        </div>
        
        {conversation.isSpeaking && (
          <div className="flex items-center gap-2 text-primary">
            <Mic className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">Agent speaking...</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {!isStarted ? (
          <Button onClick={startCall} className="gap-2">
            <Phone className="w-4 h-4" />
            Start Call
          </Button>
        ) : (
          <Button 
            onClick={endCall} 
            variant="destructive" 
            className="gap-2"
            disabled={isProcessing}
          >
            <PhoneOff className="w-4 h-4" />
            {isProcessing ? 'Processing...' : 'End Call'}
          </Button>
        )}
      </div>

      {conversation.status === 'connected' && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">Live Status:</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        </div>
      )}

      {transcript.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Call Log:</p>
          <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-muted-foreground">
            {transcript.map((msg, i) => (
              <div key={i} className="p-2 bg-muted/50 rounded">
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
