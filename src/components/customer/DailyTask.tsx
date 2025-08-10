import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DailyTask {
  id: string;
  title: string;
  description: string;
  task_date: string;
  is_active: boolean;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  is_required: boolean;
  order_index: number;
}

interface UserResponse {
  question_id: string;
  response_text?: string;
  response_options?: string[];
}

export const DailyTask = () => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [currentTask, setCurrentTask] = useState<DailyTask | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<{ [questionId: string]: UserResponse }>({});
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
    fetchCompletedTasks();
  }, []);

  useEffect(() => {
    if (currentTask) {
      fetchQuestions(currentTask.id);
    }
  }, [currentTask]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('is_active', true)
        .order('task_date', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
      
      // Set the most recent task as current
      if (data && data.length > 0) {
        setCurrentTask(data[0]);
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

  const fetchCompletedTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_responses')
        .select('daily_task_id')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const completed = [...new Set(data?.map(r => r.daily_task_id) || [])];
      setCompletedTasks(completed);
    } catch (error) {
      console.error('Error fetching completed tasks:', error);
    }
  };

  const fetchQuestions = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('daily_task_id', taskId)
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;
      setQuestions(data || []);
      setCurrentQuestionIndex(0);
      setResponses({});
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch questions",
        variant: "destructive"
      });
    }
  };

  const handleResponseChange = (questionId: string, value: string | string[]) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        ...(Array.isArray(value) 
          ? { response_options: value }
          : { response_text: value }
        )
      }
    }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    const currentResponse = responses[questionId]?.response_options || [];
    let newOptions: string[];
    
    if (checked) {
      newOptions = [...currentResponse, option];
    } else {
      newOptions = currentResponse.filter(opt => opt !== option);
    }
    
    handleResponseChange(questionId, newOptions);
  };

  const submitResponses = async () => {
    if (!currentTask) return;
    
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate required questions
      const requiredQuestions = questions.filter(q => q.is_required);
      const missingResponses = requiredQuestions.filter(q => !responses[q.id]);
      
      if (missingResponses.length > 0) {
        toast({
          title: "Incomplete Form",
          description: "Please answer all required questions",
          variant: "destructive"
        });
        return;
      }

      // Prepare responses for submission
      const responsesToSubmit = Object.values(responses).map(response => ({
        user_id: user.id,
        daily_task_id: currentTask.id,
        question_id: response.question_id,
        response_text: response.response_text || null,
        response_options: response.response_options || null
      }));

      const { error } = await supabase
        .from('user_responses')
        .upsert(responsesToSubmit, {
          onConflict: 'user_id,question_id,daily_task_id'
        });

      if (error) throw error;

      setCompletedTasks([...completedTasks, currentTask.id]);
      toast({
        title: "Success",
        description: "Your responses have been submitted successfully!"
      });
      
      // Reset form
      setResponses({});
      setCurrentQuestionIndex(0);
      
    } catch (error) {
      console.error('Error submitting responses:', error);
      toast({
        title: "Error",
        description: "Failed to submit responses",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const renderQuestion = (question: Question) => {
    const response = responses[question.id];

    switch (question.question_type) {
      case 'multiple_choice':
        return (
          <RadioGroup
            value={response?.response_text || ''}
            onValueChange={(value) => handleResponseChange(question.id, value)}
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${index}`}
                  checked={response?.response_options?.includes(option) || false}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange(question.id, option, checked as boolean)
                  }
                />
                <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      case 'text':
        return (
          <Textarea
            placeholder="Enter your response..."
            value={response?.response_text || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            className="min-h-[100px]"
          />
        );

      default:
        return <div>Unsupported question type</div>;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8">Loading...</div>;
  }

  if (!currentTask) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Active Tasks</h3>
          <p className="text-muted-foreground">Check back later for new daily tasks!</p>
        </CardContent>
      </Card>
    );
  }

  const isCompleted = completedTasks.includes(currentTask.id);
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Task Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Tasks</CardTitle>
          <CardDescription>Complete today's task to earn rewards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  currentTask.id === task.id 
                    ? 'border-primary bg-accent' 
                    : 'border-border hover:bg-accent/50'
                }`}
                onClick={() => setCurrentTask(task)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{task.title}</h3>
                    <p className="text-sm text-muted-foreground">{task.task_date}</p>
                  </div>
                  {completedTasks.includes(task.id) && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Task */}
      <Card>
        <CardHeader>
          <CardTitle>{currentTask.title}</CardTitle>
          <CardDescription>{currentTask.description}</CardDescription>
          {questions.length > 0 && !isCompleted && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{currentQuestionIndex + 1} of {questions.length}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isCompleted ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2">Task Completed!</h3>
              <p className="text-muted-foreground">Thank you for your responses.</p>
            </div>
          ) : questions.length > 0 ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center">
                    {currentQuestionIndex + 1}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-medium mb-4">
                      {questions[currentQuestionIndex].question_text}
                      {questions[currentQuestionIndex].is_required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </h3>
                    {renderQuestion(questions[currentQuestionIndex])}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={prevQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>
                
                {currentQuestionIndex === questions.length - 1 ? (
                  <Button onClick={submitResponses} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Responses'}
                  </Button>
                ) : (
                  <Button onClick={nextQuestion}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No questions available for this task.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};