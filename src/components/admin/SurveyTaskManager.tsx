import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, FileText, Plus as PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getAllDailyTasks, 
  createDailyTask, 
  updateDailyTask, 
  deleteDailyTask,
  getQuestionsForTaskAdmin,
  createQuestion,
  updateQuestion,
  deleteQuestion
} from '@/lib/api';

interface DailyTask {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  questions?: Question[];
}

interface Question {
  id: string;
  daily_task_id: string;
  question_text: string;
  question_type: 'text' | 'multiple_choice' | 'checkbox';
  options?: string[];
  is_required: boolean;
  order_index: number;
  created_at: string;
}

export const SurveyTaskManager = () => {
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showQuestionsDialog, setShowQuestionsDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [selectedTaskForQuestions, setSelectedTaskForQuestions] = useState<DailyTask | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [questionFormData, setQuestionFormData] = useState({
    question_text: '',
    question_type: 'text' as 'text' | 'multiple_choice' | 'checkbox',
    options: '',
    is_required: true
  });

  useEffect(() => {
    fetchDailyTasks();
  }, []);

  const fetchDailyTasks = async () => {
    try {
      setLoading(true);
      const data = await getAllDailyTasks();
      setDailyTasks(data);
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
      toast.error('Failed to fetch daily tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const newTask = await createDailyTask(
        formData.title,
        formData.description,
        'admin' // You'll need to get the actual admin user ID
      );

      if (newTask) {
        setDailyTasks([newTask, ...dailyTasks]);
        setShowCreateDialog(false);
        setFormData({ title: '', description: '' });
        toast.success('Survey task created successfully');
      }
    } catch (error) {
      console.error('Error creating survey task:', error);
      toast.error('Failed to create survey task');
    }
  };

  const handleEdit = async () => {
    if (!selectedTask) return;

    try {
      const success = await updateDailyTask(selectedTask.id, {
        title: formData.title,
        description: formData.description
      });

      if (success) {
        setDailyTasks(dailyTasks.map(t => 
          t.id === selectedTask.id 
            ? { ...t, ...formData }
            : t
        ));
        setShowEditDialog(false);
        setSelectedTask(null);
        setFormData({ title: '', description: '' });
        toast.success('Survey task updated successfully');
      }
    } catch (error) {
      console.error('Error updating survey task:', error);
      toast.error('Failed to update survey task');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this survey task?')) return;

    try {
      const success = await deleteDailyTask(id);
      if (success) {
        setDailyTasks(dailyTasks.filter(t => t.id !== id));
        toast.success('Survey task deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting survey task:', error);
      toast.error('Failed to delete survey task');
    }
  };

  const openEditDialog = (task: DailyTask) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || ''
    });
    setShowEditDialog(true);
  };

  const openQuestionsDialog = async (task: DailyTask) => {
    setSelectedTaskForQuestions(task);
    try {
      const questions = await getQuestionsForTaskAdmin(task.id);
      setSelectedTaskForQuestions({ ...task, questions });
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to fetch questions');
    }
    setShowQuestionsDialog(true);
  };

  const handleCreateQuestion = async () => {
    if (!selectedTaskForQuestions) return;

    try {
      const options = questionFormData.question_type !== 'text' 
        ? questionFormData.options.split(',').map(opt => opt.trim()).filter(opt => opt)
        : undefined;

      const newQuestion = await createQuestion(
        selectedTaskForQuestions.id,
        questionFormData.question_text,
        questionFormData.question_type,
        options,
        questionFormData.is_required
      );

      if (newQuestion) {
        setSelectedTaskForQuestions({
          ...selectedTaskForQuestions,
          questions: [...(selectedTaskForQuestions.questions || []), newQuestion]
        });
        setQuestionFormData({
          question_text: '',
          question_type: 'text',
          options: '',
          is_required: true
        });
        toast.success('Question added successfully');
      }
    } catch (error) {
      console.error('Error creating question:', error);
      toast.error('Failed to create question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const success = await deleteQuestion(questionId);
      if (success && selectedTaskForQuestions) {
        setSelectedTaskForQuestions({
          ...selectedTaskForQuestions,
          questions: selectedTaskForQuestions.questions?.filter(q => q.id !== questionId) || []
        });
        toast.success('Question deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
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
          <h2 className="text-2xl font-bold">Survey Tasks Management</h2>
          <p className="text-gray-600">Manage survey tasks and their questions</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Survey Task</span>
        </Button>
      </div>

      <div className="grid gap-4">
        {dailyTasks.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-gray-500">No survey tasks found. Create your first one!</p>
            </CardContent>
          </Card>
        ) : (
          dailyTasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <Badge variant={task.is_active ? 'default' : 'secondary'}>
                          {task.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-gray-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Created: {formatDate(task.created_at)}</span>
                        <span>Questions: {task.questions?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openQuestionsDialog(task)}
                    >
                      <PlusIcon className="h-4 w-4" />
                      Questions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(task)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(task.id)}
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
            <DialogTitle>Add New Survey Task</DialogTitle>
            <DialogDescription>
              Create a new survey task for daily survey tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter survey title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter survey description"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.title}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Survey Task</DialogTitle>
            <DialogDescription>
              Update the survey task details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter survey title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter survey description"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={!formData.title}>
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Questions Dialog */}
      <Dialog open={showQuestionsDialog} onOpenChange={setShowQuestionsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Questions - {selectedTaskForQuestions?.title}</DialogTitle>
            <DialogDescription>
              Add and manage questions for this survey task.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTaskForQuestions && (
            <div className="space-y-6">
              {/* Add Question Form */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Add New Question</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Question Text</label>
                    <Input
                      value={questionFormData.question_text}
                      onChange={(e) => setQuestionFormData({ ...questionFormData, question_text: e.target.value })}
                      placeholder="Enter your question"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Question Type</label>
                      <select
                        value={questionFormData.question_type}
                        onChange={(e) => setQuestionFormData({ ...questionFormData, question_type: e.target.value as any })}
                        className="w-full p-2 border rounded text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Required</label>
                      <select
                        value={questionFormData.is_required.toString()}
                        onChange={(e) => setQuestionFormData({ ...questionFormData, is_required: e.target.value === 'true' })}
                        className="w-full p-2 border rounded text-sm"
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  </div>
                  {(questionFormData.question_type === 'multiple_choice' || questionFormData.question_type === 'checkbox') && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Options (comma-separated)</label>
                      <Input
                        value={questionFormData.options}
                        onChange={(e) => setQuestionFormData({ ...questionFormData, options: e.target.value })}
                        placeholder="Option 1, Option 2, Option 3"
                      />
                    </div>
                  )}
                  <Button 
                    onClick={handleCreateQuestion} 
                    disabled={!questionFormData.question_text}
                    size="sm"
                  >
                    Add Question
                  </Button>
                </div>
              </div>

              {/* Existing Questions */}
              <div>
                <h4 className="font-semibold mb-3">Existing Questions</h4>
                <div className="space-y-3">
                  {selectedTaskForQuestions.questions?.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No questions yet. Add your first question above!</p>
                  ) : (
                    selectedTaskForQuestions.questions?.map((question, index) => (
                      <div key={question.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium">Q{index + 1}:</span>
                              <span>{question.question_text}</span>
                              <Badge variant="outline" className="text-xs">
                                {question.question_type}
                              </Badge>
                              {question.is_required && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                            {question.options && question.options.length > 0 && (
                              <div className="text-sm text-gray-600 ml-4">
                                Options: {question.options.join(', ')}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
