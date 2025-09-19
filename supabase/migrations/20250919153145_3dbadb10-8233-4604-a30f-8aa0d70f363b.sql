-- Create video_links table for managing video content
CREATE TABLE public.video_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.video_links ENABLE ROW LEVEL SECURITY;

-- Create policies for video_links
CREATE POLICY "Admins can manage video links" 
ON public.video_links 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active video links" 
ON public.video_links 
FOR SELECT 
USING (is_active = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_video_links_updated_at
BEFORE UPDATE ON public.video_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add table for tracking video task completions specifically
CREATE TABLE public.video_task_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_link_id UUID NOT NULL REFERENCES public.video_links(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reward_amount NUMERIC NOT NULL DEFAULT 0
);

-- Add unique constraint to prevent duplicate completions per day
ALTER TABLE public.video_task_completions 
ADD CONSTRAINT unique_user_video_daily 
UNIQUE (user_id, video_link_id, DATE(completed_at));

-- Enable RLS for video task completions
ALTER TABLE public.video_task_completions ENABLE ROW LEVEL SECURITY;

-- Create policies for video task completions
CREATE POLICY "Admins can view all video task completions"
ON public.video_task_completions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own video task completions"
ON public.video_task_completions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video task completions"
ON public.video_task_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);