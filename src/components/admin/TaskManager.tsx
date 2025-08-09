import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DailyTask {
  id: string;
  title: string;
  description: string;
  task_date: string;
  is_active: boolean;
  created_at: string;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  is_required: boolean;
  order_index: number;
  is_active: boolean;
  daily_task_id: string;
}

export const TaskManager = () => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_date: new Date().toISOString().split('T')[0]
  });

  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    options: [''],
    is_required: true,
    order_index: 0
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      fetchQuestions(selectedTask);
    }
  }, [selectedTask]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
      if (data && data.length > 0 && !selectedTask) {
        setSelectedTask(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch daily tasks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('daily_task_id', taskId)
        .order('order_index');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch questions",
        variant: "destructive"
      });
    }
  };

  const createTask = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_tasks')
        .insert([newTask])
        .select()
        .single();

      if (error) throw error;

      setTasks([data, ...tasks]);
      setNewTask({ title: '', description: '', task_date: new Date().toISOString().split('T')[0] });
      setShowNewTaskForm(false);
      toast({
        title: "Success",
        description: "Daily task created successfully"
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create daily task",
        variant: "destructive"
      });
    }
  };

  const createQuestion = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert([{
          ...newQuestion,
          daily_task_id: selectedTask,
          options: newQuestion.question_type === 'text' ? null : newQuestion.options.filter(opt => opt.trim())
        }])
        .select()
        .single();

      if (error) throw error;

      setQuestions([...questions, data]);
      setNewQuestion({
        question_text: '',
        question_type: 'multiple_choice',
        options: [''],
        is_required: true,
        order_index: questions.length
      });
      setShowNewQuestionForm(false);
      toast({
        title: "Success",
        description: "Question created successfully"
      });
    } catch (error) {
      console.error('Error creating question:', error);
      toast({
        title: "Error",
        description: "Failed to create question",
        variant: "destructive"
      });
    }
  };

  const deleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      setQuestions(questions.filter(q => q.id !== questionId));
      toast({
        title: "Success",
        description: "Question deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive"
      });
    }
  };

  const addOptionField = () => {
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, '']
    });
  };

  const updateOption = (index: number, value: string) => {
    const updatedOptions = [...newQuestion.options];
    updatedOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: updatedOptions });
  };

  const removeOption = (index: number) => {
    const updatedOptions = newQuestion.options.filter((_, i) => i !== index);
    setNewQuestion({ ...newQuestion, options: updatedOptions });
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tasks Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Daily Tasks</CardTitle>
              <CardDescription>Manage daily tasks for customers</CardDescription>
            </div>
            <Button onClick={() => setShowNewTaskForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTask === task.id ? 'border-primary bg-accent' : 'border-border hover:bg-accent/50'
                }`}
                onClick={() => setSelectedTask(task.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{task.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">Date: {task.task_date}</p>
                  </div>
                  <Badge variant={task.is_active ? "default" : "secondary"}>
                    {task.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {showNewTaskForm && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-4">Create New Task</h3>
              <div className="space-y-4">
                <Input
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
                <Textarea
                  placeholder="Task description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
                <Input
                  type="date"
                  value={newTask.task_date}
                  onChange={(e) => setNewTask({ ...newTask, task_date: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button onClick={createTask}>Create Task</Button>
                  <Button variant="outline" onClick={() => setShowNewTaskForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions Management */}
      {selectedTask && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Questions</CardTitle>
                <CardDescription>Manage questions for selected task</CardDescription>
              </div>
              <Button onClick={() => setShowNewQuestionForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Question
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={question.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">Q{index + 1}</span>
                        <Badge variant="outline">{question.question_type}</Badge>
                        {question.is_required && <Badge variant="secondary">Required</Badge>}
                      </div>
                      <p className="font-medium">{question.question_text}</p>
                      {question.options && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground">Options:</p>
                          <ul className="text-sm list-disc list-inside mt-1">
                            {question.options.map((option, idx) => (
                              <li key={idx}>{option}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {showNewQuestionForm && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-4">Create New Question</h3>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Question text"
                      value={newQuestion.question_text}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                    />
                    
                    <Select 
                      value={newQuestion.question_type} 
                      onValueChange={(value) => setNewQuestion({ ...newQuestion, question_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Question type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="checkbox">Checkbox (Multiple Select)</SelectItem>
                        <SelectItem value="text">Text Input</SelectItem>
                      </SelectContent>
                    </Select>

                    {newQuestion.question_type !== 'text' && (
                      <div>
                        <label className="text-sm font-medium">Options:</label>
                        {newQuestion.options.map((option, index) => (
                          <div key={index} className="flex gap-2 mt-2">
                            <Input
                              placeholder={`Option ${index + 1}`}
                              value={option}
                              onChange={(e) => updateOption(index, e.target.value)}
                            />
                            {newQuestion.options.length > 1 && (
                              <Button variant="outline" size="sm" onClick={() => removeOption(index)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addOptionField} className="mt-2">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button onClick={createQuestion}>Create Question</Button>
                      <Button variant="outline" onClick={() => setShowNewQuestionForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};