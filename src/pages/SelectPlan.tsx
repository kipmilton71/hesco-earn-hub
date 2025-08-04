import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
  features: string[];
  is_popular?: boolean;
}

const SelectPlan = () => {
  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication and fetch plans
    const initializePage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUser(session.user);

      // Check if user already has an active subscription or pending application
      const { data: existingApplication } = await supabase
        .from('user_applications')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (existingApplication) {
        if (existingApplication.status === 'approved') {
          navigate('/dashboard');
        } else {
          navigate('/pending');
        }
        return;
      }

      // Fetch subscription plans
      const { data: plansData, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load subscription plans",
          variant: "destructive"
        });
      } else {
        setPlans(plansData || []);
      }

      setLoading(false);
    };

    initializePage();
  }, [navigate, toast]);

  const handleSelectPlan = async (planId: string) => {
    if (!user) return;

    setSubmitting(true);
    try {
      // Create user application record
      const { error } = await supabase
        .from('user_applications')
        .insert({
          user_id: user.id,
          subscription_plan_id: planId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Plan Selected",
        description: "Redirecting to payment page...",
      });

      // Redirect to payment page with plan ID
      navigate(`/payment?plan=${planId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to select plan",
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

  return (
    <div className="min-h-screen bg-gradient-hero py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-lg">
            Select the subscription plan that best fits your needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative shadow-card hover:shadow-glow transition-all duration-300 ${
                selectedPlan === plan.id ? 'ring-2 ring-primary' : ''
              } ${plan.is_popular ? 'scale-105' : ''}`}
            >
              {plan.is_popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-primary">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">
                    {plan.currency} {plan.price.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">
                    /{plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-secondary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={submitting}
                  className={`w-full ${
                    plan.is_popular 
                      ? 'bg-gradient-primary hover:opacity-90' 
                      : 'bg-gradient-secondary hover:opacity-90'
                  }`}
                >
                  {submitting && selectedPlan === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Selecting...
                    </>
                  ) : (
                    'Select Plan'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="hover:bg-accent"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectPlan;