import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VoiceCallHandler } from "./VoiceCallHandler";
import { Phone } from "lucide-react";

interface IncomingCallModalProps {
  isOpen: boolean;
  leadId: string;
  leadName: string;
  agentId: string;
  onClose: () => void;
}

export function IncomingCallModal({ 
  isOpen, 
  leadId, 
  leadName,
  agentId, 
  onClose 
}: IncomingCallModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border-primary/20 shadow-2xl">
        {/* Outstanding Header */}
        <div className="relative -mx-6 -mt-6 mb-6 overflow-hidden rounded-t-lg bg-gradient-to-br from-primary via-accent to-primary p-8">
          <div className="absolute inset-0 bg-grid-white/10" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm animate-pulse-soft">
              <Phone className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">
                AI Agent Calling
              </h2>
              <p className="text-white/90 text-lg">
                Calling {leadName}
              </p>
            </div>
          </div>
          {/* Animated rings */}
          <div className="absolute -right-8 -top-8 h-32 w-32 animate-ping rounded-full bg-white/10" />
          <div className="absolute -right-4 -top-4 h-24 w-24 animate-pulse rounded-full bg-white/20" />
        </div>

        {/* Call Handler */}
        <div className="space-y-4">
          <VoiceCallHandler 
            leadId={leadId}
            agentId={agentId}
            onComplete={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}