import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
              if (session) {
          // Check if user is admin
          const { data: roleData, error: roleError } = await supabase
            .rpc('get_current_user_role');
          
          if (roleError) {
            console.error('Error checking user role:', roleError);
            // Default to dashboard if role check fails
            navigate('/dashboard');
          } else if (roleData === 'admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }
    };
    checkUser();
  }, [navigate]);

  const validateForm = () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please provide an email address",
        variant: "destructive"
      });
      return false;
    }

    if (!password) {
      toast({
        title: "Error", 
        description: "Password is required",
        variant: "destructive"
      });
      return false;
    }

    if (!isLogin && password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return false;
    }

    if (!isLogin && password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return false;
    }

    // Additional validation for signup
    if (!isLogin) {
      if (!email.includes('@')) {
        toast({
          title: "Error",
          description: "Please enter a valid email address",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password,
        });

        if (error) throw error;

        // Check if user is admin
        const { data: roleData, error: roleError } = await supabase
          .rpc('get_current_user_role');

        toast({
          title: "Success",
          description: "Logged in successfully!"
        });
        
        if (roleError) {
          console.error('Error checking user role:', roleError);
          // Default to dashboard if role check fails
          navigate('/dashboard');
        } else if (roleData === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        // Sign up - email only
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/select-plan`
          }
        });

        if (error) {
          console.error('Signup error:', error);
          
          // Handle specific error cases
          if (error.message?.includes('422')) {
            throw new Error('Invalid signup data. Please check your information and try again.');
          } else if (error.message?.includes('500')) {
            throw new Error('Server error. Please try again in a few moments.');
          } else if (error.message?.includes('Database error saving new user')) {
            throw new Error('Unable to create account. Please try again or contact support.');
          } else {
            throw error;
          }
        }

        // Manually create profile to avoid database trigger issues
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              email: email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't throw error here, let user continue
          }
        }

        console.log('User created successfully:', data.user?.id);

        toast({
          title: "Success",
          description: "Account created! Please check your email to verify your account."
        });
        
        // Redirect to plan selection after successful signup
        navigate('/select-plan');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      let errorMessage = "An error occurred during authentication";
      
             if (error.message) {
         if (error.message.includes('Email not confirmed')) {
           errorMessage = "Please check your email and click the verification link";
         } else if (error.message.includes('Invalid login credentials')) {
           errorMessage = "Invalid email or password";
         } else if (error.message.includes('User already registered')) {
           errorMessage = "An account with this email already exists";
         } else if (error.message.includes('Password should be at least')) {
           errorMessage = "Password must be at least 6 characters long";
         } else if (error.message.includes('database error')) {
           errorMessage = "Database error. Please try again or contact support.";
         } else {
           errorMessage = error.message;
         }
       }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Hesco Technologies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={isLogin ? "login" : "signup"} onValueChange={(value) => setIsLogin(value === "login")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
                         <TabsContent value="login" className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="email">Email</Label>
                 <Input
                   id="email"
                   type="email"
                   placeholder="Enter your email"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                 />
               </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

                         <TabsContent value="signup" className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="signup-email">Email</Label>
                 <Input
                   id="signup-email"
                   type="email"
                   placeholder="Enter your email"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                 />
               </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleAuth}
            disabled={loading}
            className="w-full mt-6 bg-gradient-primary hover:opacity-90"
          >
            {loading ? "Please wait..." : (isLogin ? "Login" : "Create Account")}
          </Button>

          <div className="text-center mt-4">
            <Button
              variant="link"
              onClick={() => navigate('/')}
              className="text-muted-foreground"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;