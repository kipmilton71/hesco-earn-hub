import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DailyTask {
  id: string;
  title: string;
  description: string;
  task_date: string;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  order_index: number;
}

interface UserResponse {
  id: string;
  user_id: string;
  question_id: string;
  response_text: string | null;
  response_options: string[] | null;
  created_at: string;
  profiles: {
    email: string;
  };
  questions: {
    question_text: string;
    question_type: string;
    order_index: number;
  };
}

export const ResponseViewer = () => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [responses, setResponses] = useState<UserResponse[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      fetchResponses(selectedTask);
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
      if (data && data.length > 0) {
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
        .select('id, question_text, question_type, order_index')
        .eq('daily_task_id', taskId)
        .order('order_index');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const fetchResponses = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_responses')
        .select(`
          *,
          profiles!user_responses_user_id_fkey (email),
          questions!user_responses_question_id_fkey (question_text, question_type, order_index)
        `)
        .eq('daily_task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch responses",
        variant: "destructive"
      });
    }
  };

  const groupResponsesByUser = () => {
    const grouped: { [userId: string]: { email: string; responses: UserResponse[] } } = {};
    
    responses.forEach(response => {
      if (!grouped[response.user_id]) {
        grouped[response.user_id] = {
          email: response.profiles?.email || 'Unknown',
          responses: []
        };
      }
      grouped[response.user_id].responses.push(response);
    });

    return grouped;
  };

  const formatResponse = (response: UserResponse) => {
    if (response.response_options && response.response_options.length > 0) {
      return response.response_options.join(', ');
    }
    return response.response_text || 'No response';
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8">Loading...</div>;
  }

  const groupedResponses = groupResponsesByUser();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Response Viewer</CardTitle>
          <CardDescription>View customer responses to daily tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a task to view responses" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title} - {task.task_date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTask && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{Object.keys(groupedResponses).length}</div>
                    <p className="text-sm text-muted-foreground">Total Respondents</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{responses.length}</div>
                    <p className="text-sm text-muted-foreground">Total Responses</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{questions.length}</div>
                    <p className="text-sm text-muted-foreground">Total Questions</p>
                  </CardContent>
                </Card>
              </div>

              {Object.keys(groupedResponses).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupedResponses).map(([userId, userData]) => (
                    <Card key={userId}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {userData.email}
                          <Badge variant="outline" className="ml-2">
                            {userData.responses.length} responses
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Question</TableHead>
                              <TableHead>Response</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Submitted</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userData.responses
                              .sort((a, b) => (a.questions?.order_index || 0) - (b.questions?.order_index || 0))
                              .map((response) => (
                                <TableRow key={response.id}>
                                  <TableCell className="font-medium">
                                    {response.questions?.question_text || 'Unknown Question'}
                                  </TableCell>
                                  <TableCell>{formatResponse(response)}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">
                                      {response.questions?.question_type || 'unknown'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {new Date(response.created_at).toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No responses found for this task.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};