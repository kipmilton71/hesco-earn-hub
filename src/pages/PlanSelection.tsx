import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Star } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  isElite?: boolean;
}

const PlanSelection = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const plans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 500,
      currency: 'KES',
      description: 'Perfect for beginners',
      features: [
        'Basic task access',
        '1-level referral earnings',
        'Weekly payouts',
        'WhatsApp support',
        'Basic training materials'
      ]
    },
    {
      id: 'amateur',
      name: 'Amateur',
      price: 1000,
      currency: 'KES',
      description: 'For growing your network',
      features: [
        'More task opportunities',
        '2-level referral earnings',
        'Bi-weekly payouts',
        'Priority support',
        'Advanced training',
        'Bonus challenges'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 2000,
      currency: 'KES',
      description: 'For serious earners',
      isPopular: true,
      features: [
        'Premium task access',
        '3-level referral earnings',
        'Daily payouts',
        'Dedicated support',
        'Pro training modules',
        'Exclusive bonuses',
        'Team building tools'
      ]
    },
    {
      id: 'elite',
      name: 'Elite',
      price: 5000,
      currency: 'KES',
      description: 'Maximum earning potential',
      isElite: true,
      features: [
        'All premium features',
        'Maximum referral levels',
        'Instant payouts',
        'VIP support',
        'Leadership training',
        'Monthly bonuses',
        'Advanced analytics',
        'Personal mentor'
      ]
    }
  ];

  useEffect(() => {
    const initializePage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUser(session.user);
      setLoading(false);
    };

    initializePage();
  }, [navigate]);

  const handleSelectPlan = async (planId: string) => {
    if (!user) return;

    setSelectedPlan(planId);
    setSubmitting(true);
    
    try {
      // Update user's plan selection in the database
      const { error } = await supabase
        .from('user_plan_selections')
        .upsert({
          user_id: user.id,
          selected_plan: planId,
          selected_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Plan Selected",
        description: "Your plan has been successfully selected!",
      });

      navigate('/dashboard');
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
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Choose Your Earning Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Congratulations on your payment! Now select the plan that best fits your earning goals.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative shadow-card hover:shadow-glow transition-all duration-300 ${
                selectedPlan === plan.id ? 'ring-2 ring-primary' : ''
              } ${plan.isPopular ? 'scale-105 border-primary' : ''} ${
                plan.isElite ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50' : ''
              }`}
            >
              {plan.isPopular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-primary">
                  Most Popular
                </Badge>
              )}
              
              {plan.isElite && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                  <Star className="h-3 w-3 mr-1" />
                  Elite
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-primary">
                    {plan.currency} {plan.price.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                      <span className="text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={submitting}
                  className={`w-full mt-6 ${
                    plan.isPopular 
                      ? 'bg-gradient-primary hover:opacity-90' 
                      : plan.isElite
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white'
                      : 'bg-gradient-secondary hover:opacity-90'
                  }`}
                >
                  {submitting && selectedPlan === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Selecting...
                    </>
                  ) : (
                    'Get Started'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlanSelection; 