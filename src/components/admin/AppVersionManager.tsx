import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Download, Trash2, Plus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AppVersion {
  id: string;
  version_name: string;
  version_code: number;
  file_path: string;
  file_size: number | null;
  is_active: boolean;
  release_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function AppVersionManager() {
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [versionName, setVersionName] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [apkFile, setApkFile] = useState<File | null>(null);

  useEffect(() => {
    loadAppVersions();
  }, []);

  const loadAppVersions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading app versions:', error);
        toast.error('Failed to load app versions');
        return;
      }

      setAppVersions(data || []);
    } catch (error) {
      console.error('Error loading app versions:', error);
      toast.error('Failed to load app versions');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.apk')) {
        toast.error('Please select a valid APK file');
        return;
      }
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast.error('File size must be less than 100MB');
        return;
      }
      setApkFile(file);
    }
  };

  const uploadApkFile = async (file: File): Promise<string | null> => {
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('apk-files')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        toast.error('Failed to upload APK file');
        return null;
      }

      return filePath;
    } catch (error) {
      console.error('Error uploading APK file:', error);
      toast.error('Failed to upload APK file');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!versionName || !versionCode || !apkFile) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setUploadLoading(true);

      // Upload APK file
      const filePath = await uploadApkFile(apkFile);
      if (!filePath) return;

      // Create app version record
      const { error: insertError } = await supabase
        .from('app_versions')
        .insert({
          version_name: versionName,
          version_code: parseInt(versionCode),
          file_path: filePath,
          file_size: apkFile.size,
          release_notes: releaseNotes || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (insertError) {
        console.error('Error creating app version:', insertError);
        toast.error('Failed to create app version');
        return;
      }

      toast.success('App version uploaded successfully!');
      setIsDialogOpen(false);
      resetForm();
      await loadAppVersions();
    } catch (error) {
      console.error('Error creating app version:', error);
      toast.error('Failed to create app version');
    } finally {
      setUploadLoading(false);
    }
  };

  const resetForm = () => {
    setVersionName('');
    setVersionCode('');
    setReleaseNotes('');
    setApkFile(null);
  };

  const handleSetActive = async (versionId: string) => {
    try {
      // First, deactivate all versions
      await supabase
        .from('app_versions')
        .update({ is_active: false })
        .neq('id', 'never_matches'); // Update all rows

      // Then activate the selected version
      const { error } = await supabase
        .from('app_versions')
        .update({ is_active: true })
        .eq('id', versionId);

      if (error) {
        console.error('Error setting active version:', error);
        toast.error('Failed to set active version');
        return;
      }

      toast.success('Active version updated successfully!');
      await loadAppVersions();
    } catch (error) {
      console.error('Error setting active version:', error);
      toast.error('Failed to set active version');
    }
  };

  const handleDownload = async (filePath: string, versionName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('apk-files')
        .download(filePath);

      if (error) {
        console.error('Error downloading file:', error);
        toast.error('Failed to download file');
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HescoEarnHub_v${versionName}.apk`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDelete = async (versionId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this app version?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('apk-files')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('app_versions')
        .delete()
        .eq('id', versionId);

      if (dbError) {
        console.error('Error deleting app version:', dbError);
        toast.error('Failed to delete app version');
        return;
      }

      toast.success('App version deleted successfully!');
      await loadAppVersions();
    } catch (error) {
      console.error('Error deleting app version:', error);
      toast.error('Failed to delete app version');
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>App Version Management</CardTitle>
            <CardDescription>
              Upload and manage APK files for users to download
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Upload New Version</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload New App Version</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="version_name">Version Name *</Label>
                  <Input
                    id="version_name"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    placeholder="e.g., 1.0.0"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="version_code">Version Code *</Label>
                  <Input
                    id="version_code"
                    type="number"
                    value={versionCode}
                    onChange={(e) => setVersionCode(e.target.value)}
                    placeholder="e.g., 100"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="apk_file">APK File *</Label>
                  <Input
                    id="apk_file"
                    type="file"
                    accept=".apk"
                    onChange={handleFileSelect}
                    required
                  />
                  {apkFile && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {apkFile.name} ({formatFileSize(apkFile.size)})
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="release_notes">Release Notes</Label>
                  <Textarea
                    id="release_notes"
                    value={releaseNotes}
                    onChange={(e) => setReleaseNotes(e.target.value)}
                    placeholder="What's new in this version..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploadLoading}>
                    {uploadLoading ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {appVersions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No app versions uploaded yet. Upload your first APK file to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>File Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Release Notes</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appVersions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{version.version_name}</p>
                      <p className="text-sm text-gray-500">Code: {version.version_code}</p>
                    </div>
                  </TableCell>
                  <TableCell>{formatFileSize(version.file_size)}</TableCell>
                  <TableCell>
                    {version.is_active ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-sm">
                      {version.release_notes || 'No release notes'}
                    </p>
                  </TableCell>
                  <TableCell>{formatDate(version.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {!version.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetActive(version.id)}
                        >
                          Set Active
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(version.file_path, version.version_name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(version.id, version.file_path)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}