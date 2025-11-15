import { useConversation } from '@11labs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VoiceCallHandlerProps {
  leadId: string;
  agentId: string;
  onComplete: () => void;
}

export function VoiceCallHandler({ leadId, agentId, onComplete }: VoiceCallHandlerProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [callState, setCallState] = useState<'initializing' | 'connecting' | 'connected' | 'failed'>('initializing');

  const conversation = useConversation({
    onConnect: async () => {
      console.log('Call connected successfully');
      setCallState('connected');
      setIsStarted(true);
      setIsInitializing(false);
      
      await supabase.from('leads').update({
        status: 'calling',
        call_started_at: new Date().toISOString()
      }).eq('id', leadId);
    },
    onDisconnect: async () => {
      console.log('Call disconnected - callState:', callState, 'isStarted:', isStarted);
      
      // Only process disconnect if we successfully connected
      if (callState === 'connected' && isStarted) {
        await supabase.from('leads').update({
          status: 'call_completed',
          call_ended_at: new Date().toISOString()
        }).eq('id', leadId);
        onComplete();
      } else if (callState === 'connecting') {
        // Call failed during connection
        console.error('Call failed to connect properly');
        setCallState('failed');
      }
    },
    onMessage: (message) => {
      console.log('Message received:', message);
      setTranscript(prev => [...prev, JSON.stringify(message)]);
    },
    onError: (error) => {
      console.error('Call error details:', error);
      setCallState('failed');
      const errorMessage = String(error);
      alert(`Call error: ${errorMessage}`);
      onComplete();
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
      setCallState('connecting');
      console.log('Step 1: Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Step 2: Microphone access granted, stream active:', stream.active);
      
      console.log('Step 3: Getting signed URL for agent:', agentId);
      const { data, error } = await supabase.functions.invoke('get-agent-url', {
        body: { agentId }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Failed to get agent URL: ${error.message}`);
      }

      if (!data?.signedUrl) {
        throw new Error('No signed URL received from edge function');
      }
      
      console.log('Step 4: Signed URL received, starting conversation session...');
      await conversation.startSession({ 
        signedUrl: data.signedUrl
      });
      
      console.log('Step 5: Session start command sent, waiting for connection...');
      // Note: actual connection happens in onConnect callback
      
    } catch (error) {
      console.error('Failed to start call:', error);
      setCallState('failed');
      setIsInitializing(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to start call: ${errorMessage}`);
      onComplete();
    }
  };

  // Auto-start call when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      startCall();
    }, 500); // Small delay to ensure component is fully mounted
    
    return () => clearTimeout(timer);
  }, []);

  const endCall = async () => {
    console.log('Ending call...');
    setCallState('failed'); // Prevent onDisconnect from closing modal twice
    await conversation.endSession();
    setIsStarted(false);
  };

  // Cleanup: stop call on unmount
  useEffect(() => {
    return () => {
      if (isStarted) {
        conversation.endSession();
      }
    };
  }, [isStarted, conversation]);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Agent Call</h3>
          <p className="text-sm text-muted-foreground">
            {callState === 'initializing' && 'Preparing call...'}
            {callState === 'connecting' && 'Connecting to agent...'}
            {callState === 'connected' && 'Call in progress'}
            {callState === 'failed' && 'Call ended'}
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
        <Button 
          onClick={endCall} 
          variant="destructive" 
          className="gap-2"
          disabled={callState === 'initializing' || callState === 'failed'}
        >
          <PhoneOff className="w-4 h-4" />
          {callState === 'initializing' ? 'Preparing...' : callState === 'connecting' ? 'Connecting...' : 'Hang Up'}
        </Button>
      </div>

      {callState === 'connected' && (
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
