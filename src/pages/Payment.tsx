import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Loader2, CheckCircle } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
}

const Payment = () => {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [userApplication, setUserApplication] = useState<any>(null);
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [mpesaMessage, setMpesaMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');

  const COMPANY_MPESA_NUMBER = '0702784039';

  useEffect(() => {
    const initializePage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUser(session.user);

      if (!planId) {
        navigate('/select-plan');
        return;
      }

      // Fetch the selected plan
      const { data: planData, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error || !planData) {
        toast({
          title: "Error",
          description: "Selected plan not found",
          variant: "destructive"
        });
        navigate('/select-plan');
        return;
      }

      setPlan(planData);

      // Check if user has an application for this plan
      const { data: applicationData, error: appError } = await supabase
        .from('user_applications')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('subscription_plan_id', planId)
        .maybeSingle();

      if (appError) {
        console.error('Error fetching application:', appError);
        toast({
          title: "Error",
          description: "Failed to load application data",
          variant: "destructive"
        });
        navigate('/select-plan');
        return;
      }

      if (!applicationData) {
        toast({
          title: "Error",
          description: "No application found for this plan. Please apply first.",
          variant: "destructive"
        });
        navigate('/select-plan');
        return;
      }

      setUserApplication(applicationData);
      setLoading(false);
    };

    initializePage();
  }, [navigate, toast, planId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Number copied to clipboard"
    });
  };

  const handleSubmitPayment = async () => {
    if (!user || !plan || !userApplication) return;

    if (!mpesaNumber || !mpesaMessage) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Submit payment details
      const { error } = await supabase
        .from('payment_submissions')
        .insert({
          user_id: user.id,
          subscription_plan_id: plan.id,
          user_application_id: userApplication.id,
          mpesa_number: mpesaNumber,
          mpesa_message: mpesaMessage,
          amount: plan.price,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Payment Submitted",
        description: "Your payment details have been submitted for verification",
      });

      navigate('/pending');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit payment",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Plan not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Complete Payment
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              You're subscribing to {plan.name}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Plan Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {plan.duration_months} month{plan.duration_months > 1 ? 's' : ''} subscription
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {plan.currency} {plan.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Instructions */}
            <Card className="border-secondary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-secondary">
                  <CheckCircle className="h-5 w-5" />
                  Payment Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-accent/10 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Step 1: Send M-Pesa Payment</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Send to:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded font-mono">
                          {COMPANY_MPESA_NUMBER}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(COMPANY_MPESA_NUMBER)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Amount:</span>
                      <span className="font-semibold">
                        {plan.currency} {plan.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/10 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Step 2: Fill the form below</p>
                  <p className="text-sm text-muted-foreground">
                    After sending the payment, paste your M-Pesa confirmation message below
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mpesa-number">Your M-Pesa Number</Label>
                <Input
                  id="mpesa-number"
                  type="tel"
                  placeholder="e.g., 0712345678"
                  value={mpesaNumber}
                  onChange={(e) => setMpesaNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mpesa-message">M-Pesa Confirmation Message</Label>
                <Textarea
                  id="mpesa-message"
                  placeholder="Paste your M-Pesa confirmation message here (e.g., 'RH123ABC45 Confirmed. You have sent KSh 1,000.00 to...')"
                  value={mpesaMessage}
                  onChange={(e) => setMpesaMessage(e.target.value)}
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  This helps us verify your payment quickly
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/select-plan')}
                className="flex-1"
              >
                Back to Plans
              </Button>
              <Button
                onClick={handleSubmitPayment}
                disabled={submitting}
                className="flex-1 bg-gradient-primary hover:opacity-90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Payment'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;