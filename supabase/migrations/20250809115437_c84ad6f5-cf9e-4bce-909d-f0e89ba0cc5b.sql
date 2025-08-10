-- Create daily_tasks table
CREATE TABLE public.daily_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create questions table  
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice', -- multiple_choice, text, checkbox
  options TEXT[], -- for multiple choice and checkbox questions
  is_required BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  daily_task_id UUID REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_responses table
CREATE TABLE public.user_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  daily_task_id UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  response_text TEXT,
  response_options TEXT[], -- for multiple selections
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id, daily_task_id)
);

-- Enable RLS
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_tasks
CREATE POLICY "Admins can manage daily tasks" 
ON public.daily_tasks 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active daily tasks" 
ON public.daily_tasks 
FOR SELECT 
USING (is_active = true);

-- RLS Policies for questions
CREATE POLICY "Admins can manage questions" 
ON public.questions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active questions" 
ON public.questions 
FOR SELECT 
USING (is_active = true);

-- RLS Policies for user_responses
CREATE POLICY "Admins can view all responses" 
ON public.user_responses 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own responses" 
ON public.user_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own responses" 
ON public.user_responses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses" 
ON public.user_responses 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Insert default daily task and questions
INSERT INTO public.daily_tasks (title, description, created_by) 
VALUES (
  'Online Shopping in Kenya – Quick Survey',
  'Hi! I''m conducting a short study (<2 min) to understand how people in Kenya shop online — what works, what''s frustrating, and what could be better. Your input is anonymous and greatly appreciated!',
  (SELECT id FROM auth.users WHERE email = 'kipmilton71@gmail.com' LIMIT 1)
);

-- Get the task ID for inserting questions
DO $$
DECLARE
    task_id UUID;
BEGIN
    SELECT id INTO task_id FROM public.daily_tasks WHERE title = 'Online Shopping in Kenya – Quick Survey' LIMIT 1;
    
    -- Insert all questions
    INSERT INTO public.questions (question_text, question_type, options, is_required, order_index, daily_task_id) VALUES
    ('How often do you shop online?', 'multiple_choice', '{"Daily","Weekly","Monthly","Rarely"}', true, 1, task_id),
    ('What types of products do you usually buy online? (Select all that apply)', 'checkbox', '{"Groceries","Fashion / Clothing","Electronics / Tech","Household items","Gifts","Beauty & Personal Care","Baby products","Other"}', true, 2, task_id),
    ('Where do you usually shop online? (Select all that apply)', 'checkbox', '{"Jumia","Glovo","Kilimall","Instagram / Facebook shops","Whatsapp Vendors","Amazon","Supermarket apps (Naivas, Carrefour, etc)","Other"}', true, 3, task_id),
    ('What''s your usual budget per online shopping session (in KES)?', 'multiple_choice', '{"Under KES 1000","KES1000 - 2000","KES2000 - 5000","Over KES 5000"}', true, 4, task_id),
    ('What do you find most frustrating about online shopping? (Pick up to 2)', 'checkbox', '{"Too many options, hard to decide","Finding authentic, high-quality (non-scam) products","Hard to stick to my budget","Comparing vendors and prices takes too long","Poor delivery or service experience","Other"}', true, 5, task_id),
    ('Where do you usually look for help or ideas when choosing what to buy? (Select all that apply)', 'checkbox', '{"Google","Jumia or platform suggestions","Social media (Instagram, Tiktok, Facebook, YouTube)","Friends or Whatsapp groups","Online reviews or blogs","Other"}', true, 6, task_id),
    ('Would it help to get shopping advice (like suggestions or price comparisons) through chat or an app?', 'multiple_choice', '{"Yes, a WhatsApp-style chat would be convenient","Yes, I''d prefer using a dedicated mobile app","Either chat or app would work","Not interested","Other"}', true, 7, task_id),
    ('Which features would be most useful to you? (Pick up to 2)', 'checkbox', '{"Personalized product recommendations","Find the best option for my budget","Price comparisons across platforms","Smart shopping lists","Ask questions like \"Which one is better?\"","Get alerts on deals or discounts","Other"}', true, 8, task_id),
    ('If you could fix ONE thing about online shopping in Kenya, what would it be? (Short answer)', 'text', NULL, true, 9, task_id),
    ('Would you like early access to a tool that makes online shopping easier? (Optional)', 'multiple_choice', '{"Yes → If yes, please share your WhatsApp number or email via next question","No"}', false, 10, task_id),
    ('(If Q10 = Yes) Please share your WhatsApp number or email:', 'text', NULL, false, 11, task_id),
    ('Would you prefer door delivery or pick-up for your online purchases?', 'multiple_choice', '{"Door delivery","Pick-up from a nearby location","Either works for me"}', true, 12, task_id);
END $$;