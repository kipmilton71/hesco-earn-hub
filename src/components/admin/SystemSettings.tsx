import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Edit, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);

  // Form state
  const [settingKey, setSettingKey] = useState('');
  const [settingValue, setSettingValue] = useState('');
  const [settingDescription, setSettingDescription] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key');

      if (error) {
        console.error('Error loading system settings:', error);
        toast.error('Failed to load system settings');
        return;
      }

      setSettings(data || []);
    } catch (error) {
      console.error('Error loading system settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (setting: SystemSetting) => {
    setEditingSetting(setting);
    setSettingKey(setting.setting_key);
    setSettingValue(setting.setting_value);
    setSettingDescription(setting.setting_description || '');
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingSetting(null);
    setSettingKey('');
    setSettingValue('');
    setSettingDescription('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!settingKey || !settingValue) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaveLoading(true);
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (editingSetting) {
        // Update existing setting
        const { error } = await supabase
          .from('system_settings')
          .update({
            setting_value: settingValue,
            setting_description: settingDescription || null,
            updated_by: userId
          })
          .eq('id', editingSetting.id);

        if (error) {
          console.error('Error updating setting:', error);
          toast.error('Failed to update setting');
          return;
        }

        toast.success('Setting updated successfully!');
      } else {
        // Create new setting
        const { error } = await supabase
          .from('system_settings')
          .insert({
            setting_key: settingKey,
            setting_value: settingValue,
            setting_description: settingDescription || null,
            updated_by: userId
          });

        if (error) {
          console.error('Error creating setting:', error);
          toast.error('Failed to create setting');
          return;
        }

        toast.success('Setting created successfully!');
      }

      setIsDialogOpen(false);
      resetForm();
      await loadSettings();
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error('Failed to save setting');
    } finally {
      setSaveLoading(false);
    }
  };

  const resetForm = () => {
    setEditingSetting(null);
    setSettingKey('');
    setSettingValue('');
    setSettingDescription('');
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

  const getSettingDisplayName = (key: string): string => {
    const displayNames: Record<string, string> = {
      'mpesa_phone_number': 'M-Pesa Phone Number',
      // Add more display names as needed
    };
    return displayNames[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>System Settings</span>
            </CardTitle>
            <CardDescription>
              Manage system-wide settings like M-Pesa phone number and other configurations
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew} className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Setting</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingSetting ? 'Edit Setting' : 'Add New Setting'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="setting_key">Setting Key *</Label>
                  <Input
                    id="setting_key"
                    value={settingKey}
                    onChange={(e) => setSettingKey(e.target.value)}
                    placeholder="e.g., mpesa_phone_number"
                    disabled={!!editingSetting} // Can't edit key of existing setting
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="setting_value">Setting Value *</Label>
                  <Input
                    id="setting_value"
                    value={settingValue}
                    onChange={(e) => setSettingValue(e.target.value)}
                    placeholder="Enter the setting value"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="setting_description">Description</Label>
                  <Textarea
                    id="setting_description"
                    value={settingDescription}
                    onChange={(e) => setSettingDescription(e.target.value)}
                    placeholder="Brief description of this setting..."
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
                  <Button type="submit" disabled={saveLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {saveLoading ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {settings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No system settings configured yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setting</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{getSettingDisplayName(setting.setting_key)}</p>
                      <p className="text-sm text-gray-500">{setting.setting_key}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {setting.setting_value}
                    </code>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm">
                      {setting.setting_description || 'No description'}
                    </p>
                  </TableCell>
                  <TableCell>{formatDate(setting.updated_at)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(setting)}
                      className="flex items-center space-x-1"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </Button>
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