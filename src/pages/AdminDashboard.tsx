import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  getAllWithdrawalRequests, 
  updateWithdrawalStatus,
  getAllUserBalances,
  getAllReferrals,
  getAllTaskCompletions
} from '@/lib/api';
import { VideoLinkManager } from '@/components/admin/VideoLinkManager';
import { SurveyTaskManager } from '@/components/admin/SurveyTaskManager';
import { ApplicationManager } from '@/components/admin/ApplicationManager';
import { AppVersionManager } from '@/components/admin/AppVersionManager';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { ResponseViewer } from '@/components/admin/ResponseViewer';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Gift,
  Wallet,
  History,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  BarChart3,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  tax_amount: number;
  net_amount: number;
  mpesa_number: string;
  status: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    phone?: string;
  };
}

interface UserBalance {
  id: string;
  user_id: string;
  plan_balance: number;
  available_balance: number;
  total_earned: number;
  created_at: string;
  user?: {
    id: string;
    email: string;
    phone?: string;
  };
}

interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  level: number;
  status: string;
  created_at: string;
  referrer?: {
    id: string;
    email: string;
    created_at: string;
  };
  referred?: {
    id: string;
    email: string;
    created_at: string;
  };
}

interface TaskCompletion {
  id: string;
  user_id: string;
  task_type: string;
  task_date: string;
  reward_amount: number;
  status: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [taskCompletions, setTaskCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [withdrawals, balances, referralData, tasks] = await Promise.all([
        getAllWithdrawalRequests(),
        getAllUserBalances(),
        getAllReferrals(),
        getAllTaskCompletions()
      ]);

      setWithdrawalRequests(withdrawals);
      setUserBalances(balances);
      setReferrals(referralData);
      setTaskCompletions(tasks);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWithdrawalStatus = async () => {
    if (!selectedWithdrawal || !newStatus) return;

    try {
      setProcessingWithdrawal(true);
      const success = await updateWithdrawalStatus(
        selectedWithdrawal.id,
        newStatus as 'processing' | 'completed' | 'rejected',
        user!.id,
        notes
      );

      if (success) {
        toast.success('Withdrawal status updated successfully');
        setSelectedWithdrawal(null);
        setNewStatus('');
        setNotes('');
        await loadAdminData(); // Refresh data
      } else {
        toast.error('Failed to update withdrawal status');
      }
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
      toast.error('Failed to update withdrawal status');
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  const getTotalWithdrawals = (): number => {
    return withdrawalRequests.reduce((total, req) => total + req.amount, 0);
  };

  const getPendingWithdrawals = (): number => {
    return withdrawalRequests.filter(req => req.status === 'pending').length;
  };

  const getTotalEarnings = (): number => {
    return userBalances.reduce((total, balance) => total + balance.total_earned, 0);
  };

  const getTotalReferrals = (): number => {
    return referrals.length;
  };

  const getTotalTaskCompletions = (): number => {
    return taskCompletions.length;
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalWithdrawals())}</div>
            <p className="text-xs text-muted-foreground">
              {getPendingWithdrawals()} pending requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalEarnings())}</div>
            <p className="text-xs text-muted-foreground">All users combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalReferrals()}</div>
            <p className="text-xs text-muted-foreground">Referral relationships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Completions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalTaskCompletions()}</div>
            <p className="text-xs text-muted-foreground">Daily tasks completed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="applications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-9 text-sm">
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="videos">Video Links</TabsTrigger>
          <TabsTrigger value="surveys">Survey Tasks</TabsTrigger>
          <TabsTrigger value="app-versions">App Versions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-6">
          <ApplicationManager />
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>
                Manage user withdrawal requests and update their status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>M-Pesa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.user?.email || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{request.user?.phone || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatCurrency(request.amount)}</p>
                          <p className="text-sm text-gray-500">
                            Net: {formatCurrency(request.net_amount)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{request.mpesa_number}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(request.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => setSelectedWithdrawal(request)}
                          className="flex items-center space-x-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Balances</CardTitle>
              <CardDescription>
                View all user balances and earnings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan Balance</TableHead>
                    <TableHead>Available Balance</TableHead>
                    <TableHead>Total Earned</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userBalances.map((balance) => (
                    <TableRow key={balance.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{balance.user?.email || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{balance.user?.phone || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(balance.plan_balance)}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {formatCurrency(balance.available_balance)}
                      </TableCell>
                      <TableCell>{formatCurrency(balance.total_earned)}</TableCell>
                      <TableCell>{formatDate(balance.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Referral Network</CardTitle>
              <CardDescription>
                View all referral relationships and their status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referred</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{referral.referrer?.email || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">
                            {referral.referrer?.created_at ? formatDate(referral.referrer.created_at) : 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{referral.referred?.email || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">
                            {referral.referred?.created_at ? formatDate(referral.referred.created_at) : 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Level {referral.level}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={referral.status === 'active' ? 'default' : 'secondary'}>
                          {referral.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(referral.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Completions */}
            <Card>
              <CardHeader>
                <CardTitle>Task Completions</CardTitle>
                <CardDescription>
                  View all daily task completions and rewards.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Task Type</TableHead>
                      <TableHead>Reward</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taskCompletions.slice(0, 10).map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{task.user?.email || 'Unknown'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={task.task_type === 'video' ? 'default' : 'secondary'}>
                            {task.task_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {formatCurrency(task.reward_amount)}
                        </TableCell>
                        <TableCell>{formatDate(task.task_date)}</TableCell>
                        <TableCell>
                          <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                            {task.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Survey Responses */}
            <div className="space-y-6">
              <ResponseViewer />
            </div>
          </div>
        </TabsContent>

        {/* Video Links Tab */}
        <TabsContent value="videos" className="space-y-6">
          <VideoLinkManager />
        </TabsContent>

        {/* Survey Tasks Tab */}
        <TabsContent value="surveys" className="space-y-6">
          <SurveyTaskManager />
        </TabsContent>

        {/* App Versions Tab */}
        <TabsContent value="app-versions" className="space-y-6">
          <AppVersionManager />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <SystemSettings />
        </TabsContent>
      </Tabs>

      {/* Withdrawal Details Modal */}
      <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdrawal Request Details</DialogTitle>
            <DialogDescription>
              Review and update the withdrawal request status.
            </DialogDescription>
          </DialogHeader>
          
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">User</label>
                  <p className="text-sm text-gray-600">{selectedWithdrawal.user?.email || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">M-Pesa Number</label>
                  <p className="text-sm text-gray-600">{selectedWithdrawal.mpesa_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <p className="text-sm text-gray-600">{formatCurrency(selectedWithdrawal.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Net Amount</label>
                  <p className="text-sm text-gray-600">{formatCurrency(selectedWithdrawal.net_amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tax</label>
                  <p className="text-sm text-gray-600">{formatCurrency(selectedWithdrawal.tax_amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <p className="text-sm text-gray-600">{formatDate(selectedWithdrawal.created_at)}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Current Status</label>
                <Badge variant={getStatusBadgeVariant(selectedWithdrawal.status)} className="ml-2">
                  {selectedWithdrawal.status}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium">Update Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this withdrawal..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedWithdrawal(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateWithdrawalStatus}
                  disabled={!newStatus || processingWithdrawal}
                >
                  {processingWithdrawal ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}