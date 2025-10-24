-- Add tracking fields to orders table
ALTER TABLE public.orders
ADD COLUMN tracking_number TEXT,
ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'processing',
ADD COLUMN estimated_delivery_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;

-- Create index for tracking number lookups
CREATE INDEX idx_orders_tracking_number ON public.orders(tracking_number);

-- Update RLS policy to allow users to track orders by tracking number
CREATE POLICY "Users can view orders by tracking number"
ON public.orders
FOR SELECT
USING (tracking_number IS NOT NULL);