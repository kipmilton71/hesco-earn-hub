import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getUserBalance, 
  getCurrentUserPlanAmount, 
  completeVideoTask,
  completeSurveyTask,
  getActiveVideoLinks,
  getActiveDailyTasks,
  getTodayTaskCompletions,
  getReferralRewards,
  getUserReferrals,
  getWithdrawalRequests,
  createWithdrawalRequest,
  getTransactionHistory,
  isWithdrawalDay,
  calculateMaxWithdrawal,
  calculateTax,
  calculateNetAmount
} from '@/lib/api';
import { 
  Play, 
  FileText, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Gift,
  Wallet,
  History,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  LogOut,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DownloadAppButton } from '@/components/DownloadAppButton';

interface UserBalance {
  id: string;
  user_id: string;
  plan_balance: number;
  available_balance: number;
  total_earned: number;
  created_at: string;
  updated_at: string;
}

interface TaskCompletion {
  id: string;
  user_id: string;
  task_type: string;
  task_date: string;
  reward_amount: number;
  status: string;
  created_at: string;
}

interface ReferralReward {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_level: number;
  referred_plan_amount: number;
  reward_amount: number;
  status: string;
  created_at: string;
  referred?: {
    id: string;
    email: string;
    created_at: string;
  };
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  tax_amount: number;
  net_amount: number;
  mpesa_number: string;
  status: string;
  created_at: string;
}

interface BalanceTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [planAmount, setPlanAmount] = useState<number>(0);
  const [todayTasks, setTodayTasks] = useState<TaskCompletion[]>([]);
  const [referralRewards, setReferralRewards] = useState<ReferralReward[]>([]);
  const [userReferrals, setUserReferrals] = useState<any[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskLoading, setTaskLoading] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [approved, setApproved] = useState<boolean | null>(null);

  useEffect(() => {
    const checkApprovalAndLoad = async () => {
      if (!user) return;

      // Gate: only approved users can view dashboard
      const { data: app, error } = await supabase
        .from('user_applications')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking application status:', error);
        setApproved(false);
        navigate('/pending');
        return;
      }

      if (!app || app.status !== 'approved') {
        setApproved(false);
        navigate('/pending');
        return;
      }

      setApproved(true);
      loadDashboardData();
    };

    checkApprovalAndLoad();
  }, [user]);

  const [videoLinks, setVideoLinks] = useState<any[]>([]);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [selectedVideoLink, setSelectedVideoLink] = useState<string>('');
  const [selectedDailyTask, setSelectedDailyTask] = useState<string>('');

  const loadDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [
        balance,
        plan,
        tasks,
        rewards,
        referrals,
        withdrawals,
        history,
        videos,
        surveys
      ] = await Promise.all([
        getUserBalance(user.id),
        getCurrentUserPlanAmount(user.id),
        getTodayTaskCompletions(user.id),
        getReferralRewards(user.id),
        getUserReferrals(user.id),
        getWithdrawalRequests(user.id),
        getTransactionHistory(user.id),
        getActiveVideoLinks(),
        getActiveDailyTasks()
      ]);

      setUserBalance(balance);
      setPlanAmount(plan);
      setTodayTasks(tasks);
      setReferralRewards(rewards);
      setUserReferrals(referrals);
      setWithdrawalRequests(withdrawals);
      setTransactions(history);
      setVideoLinks(videos);
      setDailyTasks(surveys);
      
      // Set default selections
      if (videos.length > 0 && !selectedVideoLink) {
        setSelectedVideoLink(videos[0].id);
      }
      if (surveys.length > 0 && !selectedDailyTask) {
        setSelectedDailyTask(surveys[0].id);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoTaskCompletion = async () => {
    if (!user || !selectedVideoLink) return;
    
    try {
      setTaskLoading(true);
      const reward = await completeVideoTask(user.id, selectedVideoLink);
      
      if (reward) {
        toast.success(`Video completed! Earned ${reward} KSh`);
        await loadDashboardData(); // Refresh data
      } else {
        toast.error('Failed to complete video task. Please try again.');
      }
    } catch (error: any) {
      console.error('Error completing video task:', error);
      toast.error(error.message || 'Failed to complete video task');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleSurveyTaskCompletion = async () => {
    if (!user || !selectedDailyTask) return;
    
    try {
      setTaskLoading(true);
      const reward = await completeSurveyTask(user.id, selectedDailyTask);
      
      if (reward) {
        toast.success(`Survey completed! Earned ${reward} KSh`);
        await loadDashboardData(); // Refresh data
      } else {
        toast.error('Failed to complete survey task. Please try again.');
      }
    } catch (error: any) {
      console.error('Error completing survey task:', error);
      toast.error(error.message || 'Failed to complete survey task');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!user || !userBalance) return;
    
    const amount = parseFloat(withdrawalAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!mpesaNumber) {
      toast.error('Please enter your M-Pesa number');
      return;
    }

    if (!isWithdrawalDay()) {
      toast.error('Withdrawals are only allowed on Saturdays');
      return;
    }

    const maxWithdrawal = calculateMaxWithdrawal(planAmount, userBalance.available_balance);
    if (amount > maxWithdrawal) {
      toast.error(`Maximum withdrawal amount is ${maxWithdrawal} KSh`);
      return;
    }

    if (amount > userBalance.available_balance) {
      toast.error('Insufficient available balance');
      return;
    }

    try {
      setWithdrawalLoading(true);
      const withdrawalId = await createWithdrawalRequest(user.id, amount, mpesaNumber);
      
      if (withdrawalId) {
        toast.success('Withdrawal request submitted successfully!');
        setWithdrawalAmount('');
        setMpesaNumber('');
        await loadDashboardData(); // Refresh data
      } else {
        toast.error('Failed to submit withdrawal request');
      }
    } catch (error: any) {
      console.error('Error creating withdrawal request:', error);
      toast.error(error.message || 'Failed to submit withdrawal request');
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const getTaskReward = (taskType: 'video' | 'survey'): number => {
    switch (planAmount) {
      case 500:
        return taskType === 'video' ? 15 : 10;
      case 1000:
        return taskType === 'video' ? 30 : 20;
      case 2000:
        return taskType === 'video' ? 50 : 25;
      case 5000:
        return taskType === 'video' ? 70 : 30;
      default:
        return 0;
    }
  };

  const isTaskCompleted = (taskType: 'video' | 'survey'): boolean => {
    return todayTasks.some(task => task.task_type === taskType);
  };

  const isVideoCompleted = (): boolean => {
    return todayTasks.some(task => task.task_type === 'video');
  };

  const isSurveyCompleted = (): boolean => {
    return todayTasks.some(task => task.task_type === 'survey');
  };

  const getTotalReferralEarnings = (): number => {
    return referralRewards.reduce((total, reward) => total + reward.reward_amount, 0);
  };

  const getTotalTaskEarnings = (): number => {
    return todayTasks.reduce((total, task) => total + task.reward_amount, 0);
  };

  const formatCurrency = (amount: number): string => {
    return `${amount.toFixed(2)} KSh`;
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  if (approved === null || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.email}</p>
        </div>
        <Button 
          onClick={handleLogout}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Investments</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(userBalance?.plan_balance || 0)}</div>
            <p className="text-xs text-muted-foreground">Total subscription investment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(userBalance?.available_balance || 0)}</div>
            <p className="text-xs text-muted-foreground">Withdrawable balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(userBalance?.total_earned || 0)}</div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-primary text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Mobile App</CardTitle>
            <Download className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-white mb-2">Get the App</div>
            <DownloadAppButton 
              variant="outline" 
              size="sm" 
              className="bg-white text-primary hover:bg-gray-100 w-full"
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks">Daily Tasks</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Daily Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Tasks</CardTitle>
              <CardDescription>
                Complete daily tasks to earn rewards. Each task can be completed once per day.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video Task */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Play className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Watch Video</h3>
                    <p className="text-sm text-gray-600">Watch a short video to earn rewards</p>
                    <p className="text-sm font-medium text-green-600">
                      Reward: {formatCurrency(getTaskReward('video'))}
                    </p>
                    {videoLinks.length > 0 && (
                      <div className="mt-2">
                        <select
                          value={selectedVideoLink}
                          onChange={(e) => setSelectedVideoLink(e.target.value)}
                          className="w-full p-2 border rounded text-sm"
                        >
                          {videoLinks.map((video) => (
                            <option key={video.id} value={video.id}>
                              {video.title} ({video.duration_minutes} min)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isVideoCompleted() ? (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>Completed</span>
                    </Badge>
                  ) : (
                    <Button 
                      onClick={handleVideoTaskCompletion}
                      disabled={taskLoading || videoLinks.length === 0}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {taskLoading ? 'Processing...' : 'Complete'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Survey Task */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Complete Survey</h3>
                    <p className="text-sm text-gray-600">Fill out a quick survey to earn rewards</p>
                    <p className="text-sm font-medium text-green-600">
                      Reward: {formatCurrency(getTaskReward('survey'))}
                    </p>
                    {dailyTasks.length > 0 && (
                      <div className="mt-2">
                        <select
                          value={selectedDailyTask}
                          onChange={(e) => setSelectedDailyTask(e.target.value)}
                          className="w-full p-2 border rounded text-sm"
                        >
                          {dailyTasks.map((task) => (
                            <option key={task.id} value={task.id}>
                              {task.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isSurveyCompleted() ? (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>Completed</span>
                    </Badge>
                  ) : (
                    <Button 
                      onClick={handleSurveyTaskCompletion}
                      disabled={taskLoading || dailyTasks.length === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {taskLoading ? 'Processing...' : 'Complete'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Today's Progress */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Today's Progress</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tasks Completed:</span>
                    <span>{todayTasks.length}/2</span>
                  </div>
                  <Progress value={(todayTasks.length / 2) * 100} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span>Total Earned Today:</span>
                    <span className="font-medium text-green-600">{formatCurrency(getTotalTaskEarnings())}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Referral Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Referral Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Referrals:</span>
                  <span className="font-semibold">{userReferrals.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Earnings:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(getTotalReferralEarnings())}</span>
                </div>
                <Separator />
                <div className="text-sm text-gray-600">
                  <p>• 1st Level: {formatCurrency(planAmount === 500 ? 25 : planAmount === 1000 ? 50 : planAmount === 2000 ? 100 : 200)}</p>
                  <p>• 2nd Level: {formatCurrency(planAmount === 500 ? 15 : planAmount === 1000 ? 30 : planAmount === 2000 ? 75 : 150)}</p>
                  <p>• 3rd Level: {formatCurrency(planAmount === 500 ? 5 : planAmount === 1000 ? 15 : planAmount === 2000 ? 50 : 100)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Referral Link */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Gift className="h-5 w-5" />
                  <span>Your Referral Link</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Share this link with friends and earn rewards when they join!
                  </p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/register?ref=${user?.id}`}
                      readOnly
                      className="flex-1 px-3 py-2 border rounded-md text-sm bg-gray-50"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/register?ref=${user?.id}`);
                        toast.success('Referral link copied!');
                      }}
                      size="sm"
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Rewards History */}
          <Card>
            <CardHeader>
              <CardTitle>Referral Rewards History</CardTitle>
            </CardHeader>
            <CardContent>
              {referralRewards.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No referral rewards yet</p>
              ) : (
                <div className="space-y-3">
                  {referralRewards.slice(0, 10).map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Level {reward.referral_level} Referral</p>
                        <p className="text-sm text-gray-600">
                          {reward.referred?.email} • {formatDate(reward.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatCurrency(reward.reward_amount)}</p>
                        <p className="text-xs text-gray-500">Plan: {formatCurrency(reward.referred_plan_amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Withdrawal Form */}
            <Card>
              <CardHeader>
                <CardTitle>Request Withdrawal</CardTitle>
                <CardDescription>
                  Withdrawals are only allowed on Saturdays. 15% tax applies.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isWithdrawalDay() && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        Withdrawals are only allowed on Saturdays
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount (KSh)</label>
                    <input
                      type="number"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-3 py-2 border rounded-md"
                      disabled={!isWithdrawalDay()}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">M-Pesa Number</label>
                    <input
                      type="text"
                      value={mpesaNumber}
                      onChange={(e) => setMpesaNumber(e.target.value)}
                      placeholder="e.g., 254700000000"
                      className="w-full px-3 py-2 border rounded-md"
                      disabled={!isWithdrawalDay()}
                    />
                  </div>

                  {withdrawalAmount && (
                    <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Amount:</span>
                        <span>{formatCurrency(parseFloat(withdrawalAmount) || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax (15%):</span>
                        <span>-{formatCurrency(calculateTax(parseFloat(withdrawalAmount) || 0))}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Net Amount:</span>
                        <span className="text-green-600">{formatCurrency(calculateNetAmount(parseFloat(withdrawalAmount) || 0))}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleWithdrawal}
                    disabled={!isWithdrawalDay() || withdrawalLoading || !withdrawalAmount || !mpesaNumber}
                    className="w-full"
                  >
                    {withdrawalLoading ? 'Processing...' : 'Request Withdrawal'}
                  </Button>
                </div>

                {userBalance && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Maximum Withdrawal</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(calculateMaxWithdrawal(planAmount, userBalance.available_balance))}
                    </p>
                    <p className="text-xs text-gray-600">
                      Base: {formatCurrency(planAmount === 500 ? 125 : planAmount === 1000 ? 250 : planAmount === 2000 ? 325 : 500)} + Available Balance
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Withdrawal History */}
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal History</CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawalRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No withdrawal requests yet</p>
                ) : (
                  <div className="space-y-3">
                    {withdrawalRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{formatCurrency(request.amount)}</p>
                          <p className="text-sm text-gray-600">
                            {request.mpesa_number} • {formatDate(request.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={
                              request.status === 'completed' ? 'default' :
                              request.status === 'processing' ? 'secondary' :
                              request.status === 'rejected' ? 'destructive' : 'outline'
                            }
                          >
                            {request.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            Net: {formatCurrency(request.net_amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Transaction History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium capitalize">
                          {transaction.transaction_type.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-gray-600">{transaction.description}</p>
                        <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Balance: {formatCurrency(transaction.balance_after)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}