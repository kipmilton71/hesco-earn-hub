import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getAllVideoLinks, 
  createVideoLink, 
  updateVideoLink, 
  deleteVideoLink 
} from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

interface VideoLink {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export const VideoLinkManager = () => {
  const [videoLinks, setVideoLinks] = useState<VideoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoLink | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    duration_minutes: 1
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVideoLinks();
  }, []);

  const fetchVideoLinks = async () => {
    try {
      setLoading(true);
      const data = await getAllVideoLinks();
      setVideoLinks(data);
    } catch (error) {
      console.error('Error fetching video links:', error);
      toast.error('Failed to fetch video links');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const adminId = session?.user?.id || null;
      const newVideo = await createVideoLink(
        formData.title,
        formData.description,
        formData.video_url,
        formData.duration_minutes,
        adminId || ''
      );

      if (newVideo) {
        setVideoLinks([newVideo, ...videoLinks]);
        setShowCreateDialog(false);
        setFormData({ title: '', description: '', video_url: '', duration_minutes: 1 });
        toast.success('Video link created successfully');
      } else {
        toast.error('Failed to create video link');
      }
    } catch (error: any) {
      console.error('Error creating video link:', error);
      toast.error(error?.message || 'Failed to create video link');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedVideo) return;

    try {
      const success = await updateVideoLink(selectedVideo.id, {
        title: formData.title,
        description: formData.description,
        video_url: formData.video_url,
        duration_minutes: formData.duration_minutes
      });

      if (success) {
        setVideoLinks(videoLinks.map(v => 
          v.id === selectedVideo.id 
            ? { ...v, ...formData }
            : v
        ));
        setShowEditDialog(false);
        setSelectedVideo(null);
        setFormData({ title: '', description: '', video_url: '', duration_minutes: 1 });
        toast.success('Video link updated successfully');
      }
    } catch (error) {
      console.error('Error updating video link:', error);
      toast.error('Failed to update video link');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video link?')) return;

    try {
      const success = await deleteVideoLink(id);
      if (success) {
        setVideoLinks(videoLinks.filter(v => v.id !== id));
        toast.success('Video link deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting video link:', error);
      toast.error('Failed to delete video link');
    }
  };

  const openEditDialog = (video: VideoLink) => {
    setSelectedVideo(video);
    setFormData({
      title: video.title,
      description: video.description || '',
      video_url: video.video_url,
      duration_minutes: video.duration_minutes
    });
    setShowEditDialog(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Video Links Management</h2>
          <p className="text-gray-600">Manage video links for daily video tasks</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Video Link</span>
        </Button>
      </div>

      <div className="grid gap-4">
        {videoLinks.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-gray-500">No video links found. Create your first one!</p>
            </CardContent>
          </Card>
        ) : (
          videoLinks.map((video) => (
            <Card key={video.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Play className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg">{video.title}</h3>
                        <Badge variant={video.is_active ? 'default' : 'secondary'}>
                          {video.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {video.description && (
                        <p className="text-gray-600 mb-2">{video.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Duration: {video.duration_minutes} min</span>
                        <span>Created: {formatDate(video.created_at)}</span>
                      </div>
                      <a 
                        href={video.video_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Video
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(video)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(video.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Video Link</DialogTitle>
            <DialogDescription>
              Create a new video link for daily video tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter video title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter video description"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Video URL</label>
              <Input
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 1 })}
                min="1"
                max="60"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.title || !formData.video_url || submitting}>
                {submitting ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Video Link</DialogTitle>
            <DialogDescription>
              Update the video link details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter video title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter video description"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Video URL</label>
              <Input
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 1 })}
                min="1"
                max="60"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={!formData.title || !formData.video_url}>
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
