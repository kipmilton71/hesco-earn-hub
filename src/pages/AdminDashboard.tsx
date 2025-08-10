import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Pause, Users, FileText, DollarSign, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserApplication {
  id: string;
  user_id: string;
  subscription_plan_id: string;
  status: string;
  created_at: string;
  subscription_plans: {
    name: string;
    price: number;
    currency: string;
  };
  profiles: {
    email: string;
    phone: string;
  };
}

interface PaymentSubmission {
  id: string;
  user_id: string;
  mpesa_number: string;
  amount: number;
  status: string;
  created_at: string;
  profiles: {
    email: string;
  };
  subscription_plans: {
    name: string;
  };
}

const AdminDashboard = () => {
  const [applications, setApplications] = useState<UserApplication[]>([]);
  const [payments, setPayments] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/auth';
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .rpc('get_current_user_role');

      if (roleError) {
        console.error('Error fetching user role:', roleError);
        toast({
          title: "Access Denied",
          description: "Unable to verify admin access.",
          variant: "destructive",
        });
        return;
      }

      if (roleData !== 'admin') {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page.",
          variant: "destructive",
        });
        window.location.href = '/dashboard';
        return;
      }

      setUserRole(roleData);
      fetchData();
    } catch (error) {
      console.error('Error checking user role:', error);
      window.location.href = '/auth';
    }
  };

  const fetchData = async () => {
    try {
      // Fetch user applications with profile and plan data
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('user_applications')
        .select(`
          *,
          subscription_plans(name, price, currency),
          profiles(email, phone)
        `)
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      // Fetch payment submissions with profile and plan data
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payment_submissions')
        .select(`
          *,
          profiles(email),
          subscription_plans(name)
        `)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      setApplications(applicationsData || []);
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('user_applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      );

      toast({
        title: "Success",
        description: `Application ${newStatus} successfully.`,
      });

      // Refresh data to get updated counts
      fetchData();
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        title: "Error",
        description: "Failed to update application status.",
        variant: "destructive",
      });
    }
  };

  const updatePaymentStatus = async (paymentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('payment_submissions')
        .update({ status: newStatus })
        .eq('id', paymentId);

      if (error) throw error;

      setPayments(prev => 
        prev.map(payment => 
          payment.id === paymentId ? { ...payment, status: newStatus } : payment
        )
      );

      toast({
        title: "Success",
        description: `Payment ${newStatus} successfully.`,
      });

      // Refresh data to get updated counts
      fetchData();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out"
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to logout",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "outline" as const, color: "text-yellow-600" },
      approved: { variant: "default" as const, color: "text-green-600" },
      rejected: { variant: "destructive" as const, color: "text-red-600" },
      suspended: { variant: "secondary" as const, color: "text-gray-600" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant} className={config.color}>{status.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return null;
  }

  const pendingApplications = applications.filter(app => app.status === 'pending').length;
  const totalRevenue = payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
              Back to Dashboard
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApplications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* User Applications */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>User Applications</CardTitle>
            <CardDescription>Manage user subscription applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {applications.length === 0 ? (
                <p className="text-muted-foreground">No applications found.</p>
              ) : (
                applications.map((application) => (
                  <div key={application.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{application.profiles?.email}</div>
                      <div className="text-sm text-muted-foreground">
                        {application.subscription_plans?.name} - {application.subscription_plans?.currency} {application.subscription_plans?.price}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Applied: {new Date(application.created_at).toLocaleDateString()}
                        {application.profiles?.phone && ` | Phone: ${application.profiles.phone}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(application.status)}
                      {application.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateApplicationStatus(application.id, 'approved')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateApplicationStatus(application.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {application.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateApplicationStatus(application.id, 'suspended')}
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Submissions */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Submissions</CardTitle>
            <CardDescription>Review user payment submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.length === 0 ? (
                <p className="text-muted-foreground">No payments found.</p>
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{payment.profiles?.email}</div>
                      <div className="text-sm text-muted-foreground">
                        {payment.subscription_plans?.name} - KSh {Number(payment.amount).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        M-Pesa: {payment.mpesa_number} | {new Date(payment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(payment.status)}
                      {payment.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updatePaymentStatus(payment.id, 'verified')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updatePaymentStatus(payment.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;