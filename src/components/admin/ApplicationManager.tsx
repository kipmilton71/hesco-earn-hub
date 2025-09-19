import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  User,
  Calendar,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UserApplication {
  id: string;
  user_id: string;
  subscription_plan_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  profiles: {
    email: string;
    phone?: string;
  };
  subscription_plans: {
    name: string;
    price: number;
    currency: string;
  };
  payment_submissions: {
    id: string;
    amount: number;
    mpesa_number: string;
    mpesa_message: string;
    status: 'pending' | 'verified' | 'rejected';
    created_at: string;
  }[];
}

export const ApplicationManager = () => {
  const [applications, setApplications] = useState<UserApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<UserApplication | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<'approved' | 'rejected'>('approved');
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      // Fetch applications only, then compose related data to avoid PostgREST 400s from embedded relationships
      const { data: apps, error } = await supabase
        .from('user_applications')
        .select('id, user_id, subscription_plan_id, status, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
        toast.error('Failed to fetch applications');
        return;
      }

      const userIds = Array.from(new Set((apps || []).map(a => a.user_id)));
      const planIds = Array.from(new Set((apps || []).map(a => a.subscription_plan_id)));
      const [profilesRes, plansRes, paymentsRes] = await Promise.all([
        userIds.length ? supabase.from('profiles').select('id, email, phone').in('id', userIds) : Promise.resolve({ data: [], error: null } as any),
        planIds.length ? supabase.from('subscription_plans').select('id, name, price, currency').in('id', planIds) : Promise.resolve({ data: [], error: null } as any),
        supabase.from('payment_submissions').select('id, user_application_id, amount, mpesa_number, mpesa_message, status, created_at'),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const planMap = new Map((plansRes.data || []).map((p: any) => [p.id, p]));
      const paymentsByApp = new Map<string, any[]>();
      (paymentsRes.data || []).forEach((p: any) => {
        const arr = paymentsByApp.get(p.user_application_id) || [];
        arr.push(p);
        paymentsByApp.set(p.user_application_id, arr);
      });

      const composed: UserApplication[] = (apps || []).map((a: any) => ({
        id: a.id,
        user_id: a.user_id,
        subscription_plan_id: a.subscription_plan_id,
        status: a.status,
        created_at: a.created_at,
        updated_at: a.updated_at,
        profiles: (profileMap.get(a.user_id) || { email: '', phone: '' }) as { email: string; phone?: string },
        subscription_plans: (planMap.get(a.subscription_plan_id) || { name: '', price: 0, currency: 'KSh' }) as { name: string; price: number; currency: string },
        payment_submissions: (paymentsByApp.get(a.id) || []).sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()),
      }));

      setApplications(composed);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedApplication) return;

    try {
      setProcessing(true);

      // Update application status
      const { error: appError } = await supabase
        .from('user_applications')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedApplication.id);

      if (appError) {
        console.error('Error updating application:', appError);
        toast.error('Failed to update application status');
        return;
      }

      // If approved, update payment status and trigger referral rewards
      if (newStatus === 'approved' && selectedApplication.payment_submissions.length > 0) {
        const { error: paymentError } = await supabase
          .from('payment_submissions')
          .update({ status: 'verified' })
          .eq('id', selectedApplication.payment_submissions[0].id);

        if (paymentError) {
          console.error('Error updating payment status:', paymentError);
        }

        // Trigger referral rewards processing
        try {
          await supabase.rpc('process_referral_rewards', {
            referred_user_id: selectedApplication.user_id
          });
        } catch (rewardError) {
          console.error('Error processing referral rewards:', rewardError);
        }

        // Add paid amount to user's plan balance and total earnings  
        try {
          const planAmount = selectedApplication.subscription_plans.price || 0;
          if (planAmount > 0) {
            const { data: balance, error: balanceError } = await supabase
              .from('user_balances')
              .select('*')
              .eq('user_id', selectedApplication.user_id)
              .maybeSingle();

            if (balanceError) {
              console.error('Error fetching user balance:', balanceError);
            } else if (balance) {
              const { error: updateBalanceError } = await supabase
                .from('user_balances')
                .update({
                  plan_balance: (balance.plan_balance || 0) + planAmount,
                  total_earned: (balance.total_earned || 0) + planAmount,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', balance.id);
              if (updateBalanceError) {
                console.error('Error updating user balance:', updateBalanceError);
              }
            } else {
              const { error: insertBalanceError } = await supabase
                .from('user_balances')
                .insert({
                  user_id: selectedApplication.user_id,
                  plan_balance: planAmount,
                  available_balance: 0,
                  total_earned: planAmount,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              if (insertBalanceError) {
                console.error('Error creating user balance:', insertBalanceError);
              }
            }
            
            // Create balance transaction record
            const { data: currentBalance } = await supabase
              .from('user_balances')
              .select('plan_balance, total_earned')
              .eq('user_id', selectedApplication.user_id)
              .single();
              
            if (currentBalance) {
              await supabase
                .from('balance_transactions')
                .insert({
                  user_id: selectedApplication.user_id,
                  transaction_type: 'subscription_payment',
                  amount: planAmount,
                  balance_before: (currentBalance.plan_balance || 0) - planAmount,
                  balance_after: currentBalance.plan_balance || 0,
                  reference_id: selectedApplication.payment_submissions[0].id,
                  reference_table: 'payment_submissions',
                  description: `Subscription plan activation - ${selectedApplication.subscription_plans.name}`
                });
            }
          }
        } catch (earnError) {
          console.error('Error updating user balance:', earnError);
        }
      }

      toast.success(`Application ${newStatus} successfully`);
      setShowDialog(false);
      setSelectedApplication(null);
      setNotes('');
      await fetchApplications();
    } catch (error) {
      console.error('Error updating application status:', error);
      toast.error('Failed to update application status');
    } finally {
      setProcessing(false);
    }
  };

  const openDialog = (application: UserApplication) => {
    setSelectedApplication(application);
    setNewStatus(application.status === 'pending' ? 'approved' : application.status as 'approved' | 'rejected');
    setShowDialog(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'verified':
        return 'default';
      default:
        return 'outline';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'KSh') => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Application Management</h2>
          <p className="text-gray-600">Review and manage user subscription applications</p>
        </div>
        <Button onClick={fetchApplications} variant="outline">
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Applications</CardTitle>
          <CardDescription>
            Review user subscription applications and their payment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No applications found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{application.profiles.email}</p>
                        {application.profiles.phone && (
                          <p className="text-sm text-gray-500">{application.profiles.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{application.subscription_plans.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(application.subscription_plans.price, application.subscription_plans.currency)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {application.payment_submissions.length > 0 ? (
                        <div className="space-y-1">
                          <p className="font-medium">
                            {formatCurrency(application.payment_submissions[0].amount)}
                          </p>
                          <Badge variant={getStatusBadgeVariant(application.payment_submissions[0].status)}>
                            {application.payment_submissions[0].status}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-gray-400">No payment</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(application.status)}>
                        {application.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(application.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => openDialog(application)}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Review</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              Review the application details and update the status
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              {/* User Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>User Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{selectedApplication.profiles.email}</span>
                  </div>
                  {selectedApplication.profiles.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{selectedApplication.profiles.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Applied:</span>
                    <span className="font-medium">{formatDate(selectedApplication.created_at)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Subscription Plan</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plan Name:</span>
                    <span className="font-medium">{selectedApplication.subscription_plans.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedApplication.subscription_plans.price, selectedApplication.subscription_plans.currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              {selectedApplication.payment_submissions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>Payment Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedApplication.payment_submissions.map((payment) => (
                      <div key={payment.id} className="space-y-3 p-3 border rounded-lg">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Amount Paid:</span>
                          <span className="font-medium">{formatCurrency(payment.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">M-Pesa Number:</span>
                          <span className="font-medium">{payment.mpesa_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment Status:</span>
                          <Badge variant={getStatusBadgeVariant(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment Date:</span>
                          <span className="font-medium">{formatDate(payment.created_at)}</span>
                        </div>
                        {payment.mpesa_message && (
                          <div>
                            <span className="text-gray-600">M-Pesa Message:</span>
                            <p className="mt-1 p-2 bg-gray-50 rounded text-sm">
                              {payment.mpesa_message}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Status Update */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Update Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">New Status</label>
                    <Select value={newStatus} onValueChange={(value: 'approved' | 'rejected') => setNewStatus(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Approve</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="rejected">
                          <div className="flex items-center space-x-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span>Reject</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes about this decision..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowDialog(false)}
                      disabled={processing}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateStatus}
                      disabled={processing}
                      className={newStatus === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                    >
                      {processing ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        `${newStatus === 'approved' ? 'Approve' : 'Reject'} Application`
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};