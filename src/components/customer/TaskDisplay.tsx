import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, Play } from 'lucide-react';
import { getQuestionsForTaskAdmin } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Question {
  id: string;
  daily_task_id?: string;
  question_text: string;
  question_type: string;
  options?: string[];
  is_required: boolean;
  order_index: number;
}

interface DailyTask {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

interface VideoLink {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  duration_minutes: number;
  is_active: boolean;
}

interface TaskDisplayProps {
  task: DailyTask | null;
  video: VideoLink | null;
  taskType: 'survey' | 'video';
  onComplete: () => void;
  isCompleted: boolean;
  isLoading: boolean;
  reward: number;
  userId: string;
}

export const TaskDisplay: React.FC<TaskDisplayProps> = ({
  task,
  video,
  taskType,
  onComplete,
  isCompleted,
  isLoading,
  reward,
  userId
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [videoTimer, setVideoTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    if (taskType === 'survey' && task) {
      loadQuestions();
    }
  }, [task, taskType]);

  useEffect(() => {
    if (taskType === 'survey') {
      checkSurveyCompletion();
    } else if (taskType === 'video') {
      setCanComplete(videoWatched);
    }
  }, [responses, videoWatched, questions, taskType]);

  const loadQuestions = async () => {
    if (!task) return;
    
    try {
      setQuestionsLoading(true);
      const questionsData = await getQuestionsForTaskAdmin(task.id);
      setQuestions(questionsData as Question[]);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load survey questions');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const checkSurveyCompletion = () => {
    const requiredQuestions = questions.filter(q => q.is_required);
    const completedRequired = requiredQuestions.every(q => {
      const response = responses[q.id];
      if (q.question_type === 'text') {
        return response && response.trim().length > 0;
      } else if (q.question_type === 'multiple_choice') {
        return response && response.length > 0;
      } else if (q.question_type === 'checkbox') {
        return response && response.length > 0;
      }
      return false;
    });
    
    setCanComplete(completedRequired);
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleVideoClick = () => {
    if (video && !videoWatched) {
      // Open YouTube video in new tab
      window.open(video.video_url, '_blank');
      
      // Immediately mark as watched so submit button shows
      setVideoWatched(true);
      toast.success('Video opened! You can now claim your reward.');
    }
  };

  const handleComplete = async () => {
    if (taskType === 'survey' && task && questions.length > 0) {
      // Check if user has already completed this survey task TODAY by checking task_completions
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: existingCompletion } = await supabase
          .from('task_completions')
          .select('id')
          .eq('user_id', userId)
          .eq('task_type', 'survey')
          .eq('task_date', today)
          .limit(1);

        if (existingCompletion && existingCompletion.length > 0) {
          toast.error('You have already completed the survey today. Come back tomorrow!');
          return;
        }

        // Refresh session before inserting to avoid auth errors
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          toast.error('Session expired. Please login again.');
          return;
        }

        // Use supabase directly to insert responses with today's date
        const responseInserts = questions.map(q => ({
          user_id: userId,
          question_id: q.id,
          daily_task_id: task.id,
          response_text: q.question_type === 'text' ? responses[q.id] || null : null,
          response_options: q.question_type !== 'text' ? responses[q.id] || null : null,
          submitted_date: today
        }));

        const { error } = await supabase
          .from('user_responses')
          .insert(responseInserts);

        if (error) {
          console.error('Error inserting responses:', error);
          toast.error('Failed to submit survey responses');
          return;
        }
      } catch (error) {
        console.error('Error submitting responses:', error);
        toast.error('Failed to submit survey responses');
        return;
      }
    }
    
    // Call onComplete to process the task completion
    onComplete();
  };

  if (taskType === 'video' && video) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Play className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3>{video.title}</h3>
              <p className="text-sm text-muted-foreground">
                Duration: {video.duration_minutes} minutes • Reward: {reward} KSh
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {video.description && (
            <p className="text-sm text-gray-600">{video.description}</p>
          )}
          
          <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <div className="text-center text-white p-8">
              <Play className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{video.title}</h3>
              <p className="text-blue-100 mb-6">
                Click to watch this video on YouTube
              </p>
              
              {!videoWatched && (
                <Button 
                  onClick={handleVideoClick}
                  className="bg-white text-blue-600 hover:bg-blue-50"
                  size="lg"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Watch Video
                </Button>
              )}
              
              {videoWatched && (
                <div className="flex items-center justify-center text-green-300">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>Video opened!</span>
                </div>
              )}
            </div>
          </div>

          {videoWatched && !isCompleted && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Video completed! You can now claim your reward.</span>
              </p>
            </div>
          )}

          <Button 
            onClick={handleComplete}
            disabled={!canComplete || isCompleted || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Processing...' : isCompleted ? 'Completed' : videoWatched ? 'Claim Reward' : 'Complete Video First'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (taskType === 'survey' && task) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3>{task.title}</h3>
              <p className="text-sm text-muted-foreground">
                Reward: {reward} KSh
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.description && (
            <p className="text-sm text-gray-600">{task.description}</p>
          )}

          {questionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No questions available for this survey.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {questions
                .sort((a, b) => a.order_index - b.order_index)
                .map((question, index) => (
                <div key={question.id} className="space-y-2">
                  <Label className="text-sm font-medium">
                    Q{index + 1}. {question.question_text}
                    {question.is_required && <span className="text-red-500 ml-1">*</span>}
                  </Label>

                  {question.question_type === 'text' && (
                    <Textarea
                      placeholder="Enter your answer..."
                      value={responses[question.id] || ''}
                      onChange={(e) => handleResponseChange(question.id, e.target.value)}
                      className="min-h-[80px]"
                    />
                  )}

                  {question.question_type === 'multiple_choice' && question.options && (
                    <RadioGroup
                      value={responses[question.id]?.[0] || ''}
                      onValueChange={(value) => handleResponseChange(question.id, [value])}
                    >
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`${question.id}-${optionIndex}`} />
                          <Label htmlFor={`${question.id}-${optionIndex}`} className="text-sm">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {question.question_type === 'checkbox' && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${question.id}-${optionIndex}`}
                            checked={(responses[question.id] || []).includes(option)}
                            onCheckedChange={(checked) => {
                              const currentResponses = responses[question.id] || [];
                              if (checked) {
                                handleResponseChange(question.id, [...currentResponses, option]);
                              } else {
                                handleResponseChange(question.id, currentResponses.filter((r: string) => r !== option));
                              }
                            }}
                          />
                          <Label htmlFor={`${question.id}-${optionIndex}`} className="text-sm">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-600">
                    {questions.filter(q => responses[q.id] && (
                      q.question_type === 'text' ? responses[q.id].trim().length > 0 :
                      responses[q.id].length > 0
                    )).length} of {questions.length} questions answered
                  </span>
                  {canComplete && (
                    <Badge variant="secondary" className="text-green-600">
                      Ready to submit
                    </Badge>
                  )}
                </div>

                <Button 
                  onClick={handleComplete}
                  disabled={!canComplete || isCompleted || isLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? 'Processing...' : isCompleted ? 'Completed' : canComplete ? 'Submit Survey' : 'Complete Required Questions'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
};