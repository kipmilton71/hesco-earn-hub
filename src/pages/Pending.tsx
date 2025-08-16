import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface Application {
  id: string;
  status: string;
  created_at: string;
  subscription_plans: {
    name: string;
    price: number;
    currency: string;
  };
  payment_submissions: {
    amount: number;
    status: string;
    created_at: string;
  }[];
}

const Pending = () => {
  const [user, setUser] = useState<User | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchApplication = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_applications')
      .select(`
        *,
        subscription_plans (
          name,
          price,
          currency
        ),
        payment_submissions (
          amount,
          status,
          created_at
        )
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching application:', error);
      return null;
    }

    return data;
  };

  useEffect(() => {
    const initializePage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUser(session.user);

      const appData = await fetchApplication(session.user.id);
      
      if (!appData) {
        toast({
          title: "No Application Found",
          description: "Please select a subscription plan first",
          variant: "destructive"
        });
        navigate('/select-plan');
        return;
      }

      // If approved, redirect to dashboard
      if (appData.status === 'approved') {
        navigate('/dashboard');
        return;
      }

      setApplication(appData);
      setLoading(false);
    };

    initializePage();
  }, [navigate, toast]);

  const handleRefresh = async () => {
    if (!user) return;
    
    setRefreshing(true);
    const appData = await fetchApplication(user.id);
    
    if (appData) {
      setApplication(appData);
      if (appData.status === 'approved') {
        navigate('/dashboard');
      }
    }
    
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-6 w-6 text-accent" />;
      case 'approved':
        return <CheckCircle className="h-6 w-6 text-secondary" />;
      case 'rejected':
        return <XCircle className="h-6 w-6 text-destructive" />;
      default:
        return <Clock className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-accent border-accent">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-secondary border-secondary">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No application found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon(application.status)}
            </div>
            <CardTitle className="text-3xl font-bold">
              Application Status
            </CardTitle>
            <div className="flex justify-center mt-2">
              {getStatusBadge(application.status)}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {application.status === 'pending' && (
              <div className="text-center bg-accent/10 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Verification in Progress</h3>
                <p className="text-muted-foreground">
                  Our team is reviewing your payment and application. 
                  You'll be notified once the verification is complete.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  This usually takes 1-24 hours.
                </p>
                <div className="mt-4 p-4 bg-background rounded-lg">
                  <h4 className="font-semibold mb-2">What happens next?</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 text-left">
                    <li>• Admin reviews your payment submission</li>
                    <li>• Payment verification is completed</li>
                    <li>• Application is approved or rejected</li>
                    <li>• You'll be automatically redirected to dashboard</li>
                  </ul>
                </div>
              </div>
            )}

            {application.status === 'rejected' && (
              <div className="text-center bg-destructive/10 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-destructive">
                  Application Rejected
                </h3>
                <p className="text-muted-foreground">
                  Your application has been rejected. Please contact our support team 
                  for more information and assistance.
                </p>
              </div>
            )}

            {/* Application Details */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Application Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium">{application.subscription_plans.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">
                    {application.subscription_plans.currency} {application.subscription_plans.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied:</span>
                  <span className="font-medium">
                    {new Date(application.created_at).toLocaleDateString()}
                  </span>
                </div>
                {application.payment_submissions.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Status:</span>
                    <span className="font-medium">
                      {getStatusBadge(application.payment_submissions[0].status)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex-1"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Status
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Back to Home
              </Button>
            </div>

            {application.status === 'rejected' && (
              <Button
                onClick={() => navigate('/select-plan')}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                Apply Again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pending;