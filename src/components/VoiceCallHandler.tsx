import { useConversation } from '@11labs/react';
import { useEffect, useState, useRef } from 'react';
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
  
  // Use ref to track connection state reliably (avoids closure issues)
  const hasConnectedRef = useRef(false);
  const isConnectedRef = useRef(false);

  const conversation = useConversation({
    onConnect: async () => {
      console.log('✅ Call connected successfully - Audio stream established');
      hasConnectedRef.current = true;
      isConnectedRef.current = true;
      setCallState('connected');
      setIsStarted(true);
      setIsInitializing(false);
      
      await supabase.from('leads').update({
        status: 'calling',
        call_started_at: new Date().toISOString()
      }).eq('id', leadId);
    },
    onDisconnect: async () => {
      console.log('🔴 Call disconnected - hasConnected:', hasConnectedRef.current, 'isConnected:', isConnectedRef.current);
      
      // Only process disconnect if we successfully connected
      if (hasConnectedRef.current && isConnectedRef.current) {
        console.log('✅ Normal call completion');
        isConnectedRef.current = false;
        await supabase.from('leads').update({
          status: 'call_completed',
          call_ended_at: new Date().toISOString()
        }).eq('id', leadId);
        onComplete();
      } else if (!hasConnectedRef.current) {
        // Call failed during connection
        console.error('❌ Call failed - never successfully connected');
        setCallState('failed');
      }
    },
    onMessage: (message) => {
      console.log('📩 Message received:', message);
      console.log('🎧 Message from:', message.source);
      setTranscript(prev => [...prev, JSON.stringify(message)]);
    },
    onError: (error) => {
      console.error('❌ Call error details:', error);
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
      console.log('🔵 Step 1: Initiating call connection...');
      
      console.log('🔵 Step 2: Getting signed URL for agent:', agentId);
      const { data, error } = await supabase.functions.invoke('get-agent-url', {
        body: { agentId }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(`Failed to get agent URL: ${error.message}`);
      }

      if (!data?.signedUrl) {
        console.error('❌ No signed URL received from server');
        throw new Error('No signed URL received from edge function');
      }
      
      console.log('✅ Step 3: Got signed URL, starting ElevenLabs session...');
      console.log('🔵 Step 4: ElevenLabs will now request microphone access...');
      
      await conversation.startSession({ 
        signedUrl: data.signedUrl
      });
      
      console.log('✅ Step 5: Session started - waiting for connection callback...');
      console.log('🎤 Microphone should now be active and listening...');
      
    } catch (error) {
      console.error('❌ Failed to start call:', error);
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
