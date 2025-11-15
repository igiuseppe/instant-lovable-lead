-- Add transcript field to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS transcript TEXT;