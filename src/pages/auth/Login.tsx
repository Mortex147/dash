
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from "@/components/ui/separator";
import { 
  AlertCircle, 
  Info, 
  User, 
  UserCog, 
  Shield,
  Briefcase,
  Building,
  Eye,
  EyeOff 
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import AuthLayout from '@/components/layout/AuthLayout';

type DemoRole = 'candidate1' | 'candidate2' | 'candidate3' | 'candidate4' | 'candidate5' | 'manager' | 'manager2' | 'admin' | 'hr' | 'director';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoInfo, setShowDemoInfo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If user is already logged in and we're on the login page, redirect
    if (user && location.pathname === '/login') {
      // Check for intended path in session storage
      const intendedPath = sessionStorage.getItem('intendedPath');
      if (intendedPath) {
        sessionStorage.removeItem('intendedPath');
        navigate(intendedPath);
      } else {
        // Default redirect based on user role if available or redirect back
        if (location.state?.from) {
          navigate(location.state.from);
        } else {
          navigate('/dashboard/candidate');
        }
      }
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    setIsLoading(true);
    
    try {
      await signIn(email, password);
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithDemo = async (role: DemoRole) => {
    setIsLoading(true);
    
    try {
      // Demo credentials - these match the users you've created in Supabase
      const demoCredentials = {
        candidate1: {
          email: 'candidate1@example.com',
          password: 'password123'
        },
        candidate2: {
          email: 'candidate2@example.com',
          password: 'password123'
        },
        candidate3: {
          email: 'candidate3@example.com',
          password: 'password123'
        },
        candidate4: {
          email: 'candidate4@example.com',
          password: 'password123'
        },
        candidate5: {
          email: 'candidate5@example.com',
          password: 'password123'
        },
        manager: {
          email: 'manager@example.com',
          password: 'password123'
        },
        manager2: {
          email: 'manager2@example.com',
          password: 'password123'
        },
        admin: {
          email: 'achrafadmin@gmail.com',
          password: 'achraf123'
        },
        hr: {
          email: 'hr@example.com',
          password: 'password123'
        },
        director: {
          email: 'director@example.com',
          password: 'password123'
        }
      };
      
      const credentials = demoCredentials[role];
      console.log(`Attempting demo login as ${role} with email: ${credentials.email}`);
      
      // Set the email and password fields for visual feedback
      setEmail(credentials.email);
      setPassword(credentials.password);
      
      // Wait a moment for the UI to update before submitting
      setTimeout(async () => {
        try {
          await signIn(credentials.email, credentials.password);
        } catch (error: any) {
          console.error(`Demo login error (${role}):`, error);
          throw error;
        }
      }, 100);
    } catch (error: any) {
      console.error(`Demo login error (${role}):`, error);
      toast.error(`Failed to sign in with demo ${role} account: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Sign in to HireSmart</CardTitle>
            <CardDescription>
              Enter your email below to sign in to your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>

              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex items-center mb-2">
                  <Info size={16} className="mr-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Demo accounts (password: password123)
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-1 h-6 px-1 text-primary hover:bg-transparent hover:underline"
                    onClick={() => setShowDemoInfo(true)}
                  >
                    Info
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Candidates:</h4>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={() => loginWithDemo('candidate1')}
                        disabled={isLoading}
                      >
                        <User size={14} className="mr-1" />
                        Candidate 1
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={() => loginWithDemo('candidate2')}
                        disabled={isLoading}
                      >
                        <User size={14} className="mr-1" />
                        Candidate 2
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={() => loginWithDemo('candidate3')}
                        disabled={isLoading}
                      >
                        <User size={14} className="mr-1" />
                        Candidate 3
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={() => loginWithDemo('candidate4')}
                        disabled={isLoading}
                      >
                        <User size={14} className="mr-1" />
                        Candidate 4
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={() => loginWithDemo('candidate5')}
                        disabled={isLoading}
                      >
                        <User size={14} className="mr-1" />
                        Candidate 5
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Staff:</h4>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={() => loginWithDemo('manager')}
                        disabled={isLoading}
                      >
                        <UserCog size={14} className="mr-1" />
                        Manager 1
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={() => loginWithDemo('manager2')}
                        disabled={isLoading}
                      >
                        <UserCog size={14} className="mr-1" />
                        Manager 2
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={() => loginWithDemo('admin')}
                        disabled={isLoading}
                      >
                        <Shield size={14} className="mr-1" />
                        Admin
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={() => loginWithDemo('hr')}
                        disabled={isLoading}
                      >
                        <Briefcase size={14} className="mr-1" />
                        HR
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={() => loginWithDemo('director')}
                        disabled={isLoading}
                      >
                        <Building size={14} className="mr-1" />
                        Director
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm mt-4">
                Don't have an account?{" "}
                <Link to="/register" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>

      <Dialog open={showDemoInfo} onOpenChange={setShowDemoInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demo Login Information</DialogTitle>
            <DialogDescription>
              These demo accounts are for testing purposes only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center"><User size={16} className="mr-2" /> Candidate Accounts</h4>
              <div className="pl-6 space-y-1 text-sm">
                <div className="mb-2">
                  <p><span className="font-semibold">Candidate 1:</span> John Smith (Applied Stage)</p>
                  <p className="text-xs text-muted-foreground">New applicant in the North region, assigned to Manager 1</p>
                </div>
                <div className="mb-2">
                  <p><span className="font-semibold">Candidate 2:</span> Emily Johnson (Training Stage)</p>
                  <p className="text-xs text-muted-foreground">In training phase in the South region, assigned to HR</p>
                </div>
                <div className="mb-2">
                  <p><span className="font-semibold">Candidate 3:</span> Michael Brown (Task Assigned Stage)</p>
                  <p className="text-xs text-muted-foreground">Completing tasks in the East region, assigned to Director</p>
                </div>
                <div className="mb-2">
                  <p><span className="font-semibold">Candidate 4:</span> Sarah Davis (Interview Scheduled Stage)</p>
                  <p className="text-xs text-muted-foreground">Has upcoming interview in the West region, assigned to Manager 1</p>
                </div>
                <div className="mb-2">
                  <p><span className="font-semibold">Candidate 5:</span> Alex Wilson (Approved Stage)</p>
                  <p className="text-xs text-muted-foreground">Final approval stage in the Central region, assigned to Director</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Email format: candidate1@example.com through candidate5@example.com</p>
                <p className="text-xs text-muted-foreground">Password: password123</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center"><UserCog size={16} className="mr-2" /> Manager Accounts</h4>
              <div className="pl-6 space-y-1 text-sm">
                <div className="mb-2">
                  <p><span className="font-semibold">Manager 1:</span> James Thompson</p>
                  <p className="text-xs text-muted-foreground">Manages the North and West regions with 2 candidates assigned</p>
                </div>
                <div className="mb-2">
                  <p><span className="font-semibold">Manager 2:</span> Secondary Manager</p>
                  <p className="text-xs text-muted-foreground">Ready for candidate assignments</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center"><Shield size={16} className="mr-2" /> Admin Account</h4>
              <div className="pl-6 space-y-1 text-sm">
                <p><span className="font-semibold">Email:</span> admin@example.com</p>
                <p><span className="font-semibold">Password:</span> password123</p>
                <p className="text-muted-foreground text-xs">Full access to all features including assessments and training content.</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center"><Briefcase size={16} className="mr-2" /> HR Account</h4>
              <div className="pl-6 space-y-1 text-sm">
                <p><span className="font-semibold">Email:</span> hr@example.com</p>
                <p><span className="font-semibold">Password:</span> password123</p>
                <p className="text-muted-foreground text-xs">Access to candidate screening, has one candidate assigned.</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center"><Building size={16} className="mr-2" /> Director Account</h4>
              <div className="pl-6 space-y-1 text-sm">
                <p><span className="font-semibold">Email:</span> director@example.com</p>
                <p><span className="font-semibold">Password:</span> password123</p>
                <p className="text-muted-foreground text-xs">Oversees multiple regions with access to performance metrics and two assigned candidates.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  );
};

export default Login;
