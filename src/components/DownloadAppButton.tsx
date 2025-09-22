import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AppVersion {
  id: string;
  version_name: string;
  version_code: number;
  file_path: string;
  file_size: number | null;
  release_notes: string | null;
}

interface DownloadAppButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showText?: boolean;
  className?: string;
}

export function DownloadAppButton({ 
  variant = 'default', 
  size = 'default', 
  showText = true,
  className = ''
}: DownloadAppButtonProps) {
  const [activeVersion, setActiveVersion] = useState<AppVersion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadActiveVersion();
  }, []);

  const loadActiveVersion = async () => {
    try {
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error loading active version:', error);
        return;
      }

      setActiveVersion(data);
    } catch (error) {
      console.error('Error loading active version:', error);
    }
  };

  const handleDownload = async () => {
    if (!activeVersion) {
      toast.error('No app version available for download');
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.storage
        .from('apk-files')
        .download(activeVersion.file_path);

      if (error) {
        console.error('Error downloading file:', error);
        toast.error('Failed to download app');
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HescoEarnHub_v${activeVersion.version_name}.apk`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('App download started!');
    } catch (error) {
      console.error('Error downloading app:', error);
      toast.error('Failed to download app');
    } finally {
      setLoading(false);
    }
  };

  if (!activeVersion) {
    return null; // Don't show button if no active version
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={loading}
      className={`flex items-center space-x-2 ${className}`}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
      ) : (
        <Download className="h-4 w-4" />
      )}
      {showText && (
        <span>{loading ? 'Downloading...' : 'Download App'}</span>
      )}
    </Button>
  );
}

// Mobile-specific download button with better styling
export function MobileDownloadButton({ className = '' }: { className?: string }) {
  return (
    <DownloadAppButton
      variant="default"
      size="lg"
      className={`bg-gradient-primary hover:shadow-glow transition-all duration-300 ${className}`}
    />
  );
}

// Compact download button for dashboard/header
export function CompactDownloadButton({ className = '' }: { className?: string }) {
  return (
    <DownloadAppButton
      variant="outline"
      size="sm"
      showText={false}
      className={`w-10 h-10 ${className}`}
    />
  );
}