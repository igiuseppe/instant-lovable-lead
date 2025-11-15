-- Create leads table for storing inbound leads and qualification data
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  -- Possible statuses: new, calling, call_completed, qualified, not_qualified
  
  -- Call data
  call_started_at TIMESTAMP WITH TIME ZONE,
  call_ended_at TIMESTAMP WITH TIME ZONE,
  call_duration_seconds INTEGER,
  call_recording_url TEXT,
  
  -- Qualification data
  current_platform TEXT,
  monthly_traffic INTEGER,
  monthly_orders INTEGER,
  improvement_areas TEXT[],
  implementation_timeline TEXT,
  
  -- AI-generated insights
  call_summary TEXT,
  key_insights TEXT[],
  objections TEXT[],
  tone_signals TEXT,
  qualification_result TEXT,
  qualification_score INTEGER,
  next_actions TEXT[],
  
  -- Meeting booking
  meeting_scheduled BOOLEAN DEFAULT false,
  meeting_datetime TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since no auth required for MVP)
CREATE POLICY "Allow all operations on leads" 
ON public.leads 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for leads table
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- Create index for faster queries
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);