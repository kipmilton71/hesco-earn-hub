import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, CreditCard, Calendar, Loader2 } from 'lucide-react';
import { DailyTask } from '@/components/customer/DailyTask';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  created_at: string;
}

interface UserApplication {
  id: string;
  status: string;
  created_at: string;
  subscription_plans: {
    name: string;
    price: number;
    currency: string;
    duration_months: number;
  };
}

interface UserPlanSelection {
  id: string;
  selected_plan: string;
  selected_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [application, setApplication] = useState<UserApplication | null>(null);
  const [planSelection, setPlanSelection] = useState<UserPlanSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUser(session.user);

      // Check if user is admin first
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_current_user_role');

      if (roleError) {
        console.error('Error checking user role:', roleError);
        // Continue with normal flow if role check fails
      } else if (roleData === 'admin') {
        navigate('/admin');
        return;
      }

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      setProfile(profileData);

      // Fetch user application
      const { data: applicationData, error } = await supabase
        .from('user_applications')
        .select(`
          *,
          subscription_plans (
            name,
            price,
            currency,
            duration_months
          )
        `)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching application:', error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

             if (!applicationData) {
         // No application found, redirect to plan selection
         toast({
           title: "Welcome!",
           description: "Please select a subscription plan to get started.",
         });
         navigate('/select-plan');
         return;
       }

      if (applicationData.status === 'pending') {
        // Application is pending, redirect to pending page
        navigate('/pending');
        return;
      }

      if (applicationData.status === 'rejected') {
        // Application was rejected, redirect to plan selection
        toast({
          title: "Application Status",
          description: "Your previous application was rejected. Please select a new plan.",
          variant: "destructive"
        });
        navigate('/select-plan');
        return;
      }

      if (applicationData.status !== 'approved') {
        // Any other status (like suspended) should redirect to pending
        navigate('/pending');
        return;
      }

      setApplication(applicationData);

      // Fetch user's plan selection
      const { data: planSelectionData, error: planError } = await supabase
        .from('user_plan_selections')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (planError) {
        console.error('Error fetching plan selection:', planError);
      }

      setPlanSelection(planSelectionData);
      setLoading(false);
    };

    initializeDashboard();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Hesco Technologies
              </h1>
              <p className="text-muted-foreground">Dashboard</p>
            </div>
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
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <Card className="lg:col-span-2 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Welcome Back!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-lg">
                  Hello, <span className="font-semibold">{user?.email}</span>
                </p>
                <p className="text-muted-foreground">
                  Your account is verified and active. You have full access to all features.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <Badge variant="outline" className="text-secondary border-secondary">
                    ✅ Verified Account
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  <span className="text-sm">Active Subscription</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  <span className="text-sm">Full Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  <span className="text-sm">Verified Payment</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Details */}
        {application && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Subscription Details</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Current Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-lg">
                        {application.subscription_plans.name}
                      </p>
                      <p className="text-muted-foreground">
                        {application.subscription_plans.currency} {application.subscription_plans.price.toLocaleString()} 
                        / {application.subscription_plans.duration_months} month{application.subscription_plans.duration_months > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge className="bg-gradient-secondary">
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Subscription Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Started:</span>
                      <span>{new Date(application.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline" className="text-secondary border-secondary">
                        {application.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span>{application.subscription_plans.duration_months} month{application.subscription_plans.duration_months > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Selected Plan Details */}
        {planSelection && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Your Selected Plan</h2>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Active Plan: {planSelection.selected_plan.charAt(0).toUpperCase() + planSelection.selected_plan.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan Type:</span>
                    <Badge className="bg-gradient-primary">
                      {planSelection.selected_plan.charAt(0).toUpperCase() + planSelection.selected_plan.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selected On:</span>
                    <span>{new Date(planSelection.selected_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="text-secondary border-secondary">
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Daily Tasks Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Daily Tasks</h2>
          <DailyTask />
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="shadow-card hover:shadow-glow transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-3">
                  <User className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold">Profile Settings</h3>
                <p className="text-sm text-muted-foreground">Manage your account</p>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-glow transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-gradient-secondary rounded-lg flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold">Billing History</h3>
                <p className="text-sm text-muted-foreground">View payment history</p>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-glow transition-shadow cursor-pointer">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold">Upgrade Plan</h3>
                <p className="text-sm text-muted-foreground">Change subscription</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;