-- Create storage bucket for APK files
INSERT INTO storage.buckets (id, name, public) VALUES ('apk-files', 'apk-files', true);

-- Create policies for APK file uploads  
CREATE POLICY "Admin can upload APK files"
ON storage.objects
FOR INSERT 
WITH CHECK (bucket_id = 'apk-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update APK files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'apk-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete APK files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'apk-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can download APK files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'apk-files');

-- Create app_versions table to manage APK files
CREATE TABLE public.app_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_name TEXT NOT NULL,
  version_code INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  release_notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for app_versions
CREATE POLICY "Admin can manage app versions"
ON public.app_versions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view active app version"
ON public.app_versions
FOR SELECT
USING (is_active = true);

-- Create system_settings table for M-Pesa number and other settings
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_description TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system_settings
CREATE POLICY "Admin can manage system settings"
ON public.system_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default M-Pesa phone number setting
INSERT INTO public.system_settings (setting_key, setting_value, setting_description)
VALUES ('mpesa_phone_number', '254700000000', 'M-Pesa phone number for receiving payments during onboarding');

-- Create triggers for updated_at
CREATE TRIGGER update_app_versions_updated_at
BEFORE UPDATE ON public.app_versions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();