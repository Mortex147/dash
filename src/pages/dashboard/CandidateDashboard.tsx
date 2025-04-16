import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Check,
  Clock,
  FileText,
  PlayCircle,
  BookOpen,
  Briefcase,
  CalendarPlus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  Bell,
  Loader2,
  Lock,
  XCircle
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from 'date-fns';
import { Tables } from "@/integrations/supabase/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTrainingProgress, TrainingModuleProgress } from "@/hooks/useTrainingProgress";
import ErrorMessage from "@/components/ui/error-message";
import { RealtimeChannel } from '@supabase/supabase-js';

type CandidateProfile = Tables<'candidates'>;
type AssessmentResult = Tables<'assessment_results'> & { profiles?: { name?: string | null } | null };
type ActivityLog = Tables<'activity_logs'>;

interface CandidateDashboardState {
  loading: boolean;
  error: string | null;
  candidateData: CandidateProfile | null;
  assessmentResults: AssessmentResult[];
  notifications: ActivityLog[];
  applicationSubmitted: boolean;
  currentStep: number;
}

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  
  const [dashboardState, setDashboardState] = useState<Omit<CandidateDashboardState, 'trainingModules'>>({
    loading: true,
    error: null,
    candidateData: null,
    assessmentResults: [],
    notifications: [],
    applicationSubmitted: false,
    currentStep: 0,
  });

  const { 
    trainingModules, 
    progress: trainingProgressState,
    isLoading: isLoadingTraining, 
    error: trainingError, 
    refetch: refetchTraining 
  } = useTrainingProgress();

  const isLoading = dashboardState.loading || isLoadingTraining;
  const error = trainingError || dashboardState.error;

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const fetchOtherDashboardData = async () => {
      if (!user || !profile) {
        setDashboardState(prev => ({ ...prev, loading: false, error: "User not logged in" }));
        return;
      }

      if (dashboardState.candidateData === null) { 
         setDashboardState(prev => ({ ...prev, loading: true, error: null }));
      }

      try {
        console.log("Dashboard: Fetching initial non-training data for user:", user.id);

        const [candidateResult, resultsResult, notificationResult] = await Promise.all([
          supabase
            .from('candidates')
            .select('*')
            .eq('id', user.id)
            .single(),
          supabase
            .from('assessment_results')
            .select('*')
            .eq('candidate_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('activity_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)
        ]);

        if (candidateResult.error && candidateResult.error.code !== 'PGRST116') {
          throw new Error(`Candidate data fetch failed: ${candidateResult.error.message}`);
        }
        if (resultsResult.error) {
            throw new Error(`Assessment results fetch failed: ${resultsResult.error.message}`);
        }
        if (notificationResult.error) {
          console.error("Notifications fetch failed:", notificationResult.error.message);
        }

        const fetchedCandidateData = candidateResult.data;
        const assessmentResults = resultsResult.data || [];
        const notifications = notificationResult.data || [];
        
        const applicationSubmitted = 
            !!fetchedCandidateData?.resume && 
            !!fetchedCandidateData?.about_me_video && 
            !!fetchedCandidateData?.sales_pitch_video;
        
        const currentStep = fetchedCandidateData?.current_step ?? dashboardState.currentStep ?? (applicationSubmitted ? 1 : 0);

        console.log("Dashboard: Setting non-training state from initial fetch or update");
        setDashboardState(prev => ({
          ...prev,
          loading: false,
          error: null,
          candidateData: fetchedCandidateData ?? prev.candidateData,
          assessmentResults: assessmentResults,
          notifications: notifications,
          applicationSubmitted,
          currentStep,
        }));
        
        const currentStatus = fetchedCandidateData?.status?.toLowerCase();
        if (!applicationSubmitted && (currentStatus === 'applied' || currentStatus === 'screening')) {
      setTimeout(() => {
        toast.info(
          "Please complete your application to begin the hiring process",
          {
            action: {
              label: "Complete Now",
              onClick: () => navigate("/application"),
            },
            duration: 8000,
          }
        );
      }, 1000);
    }

      } catch (error: any) {
        console.error("Error fetching non-training dashboard data:", error);
        setDashboardState(prev => ({ ...prev, loading: false, error: error.message || "Failed to load dashboard data." }));
      } finally {
        setDashboardState(prev => ({ ...prev, loading: false }));
      }
    };

    if (!dashboardState.candidateData) {
      fetchOtherDashboardData();
    }

    if (user) {
       console.log("Dashboard: Setting up realtime subscription for candidate:", user.id);
      channel = supabase
        .channel(`candidate_updates_${user.id}`)
        .on<CandidateProfile>(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'candidates', 
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            console.log('Dashboard: Realtime candidate update received:', payload.new);
            const updatedCandidateData = payload.new as CandidateProfile;
            const applicationSubmitted = 
                !!updatedCandidateData?.resume && 
                !!updatedCandidateData?.about_me_video && 
                !!updatedCandidateData?.sales_pitch_video;
            const currentStep = updatedCandidateData?.current_step ?? (applicationSubmitted ? 1 : 0);
            
            setDashboardState(prev => ({
              ...prev,
              candidateData: updatedCandidateData,
              applicationSubmitted,
              currentStep,
              loading: false,
              error: null
            }));
            toast.info("Your application status has been updated!");
            refetchTraining(); 
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('Dashboard: Realtime channel subscribed successfully!');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Dashboard: Realtime channel error:', err);
            toast.error('Connection issue: Dashboard might not update instantly.');
          }
        });
    }

    return () => {
      if (channel) {
        console.log("Dashboard: Unsubscribing from realtime channel.");
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [user?.id]);

  const getModuleStatusBadge = (status: 'completed' | 'in_progress' | 'locked') => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <PlayCircle className="mr-1 h-3 w-3" /> In Progress
          </Badge>
        );
      case "locked":
        return (
          <Badge variant="secondary">
            <Lock className="mr-1 h-3 w-3" /> Locked
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
         <ErrorMessage 
           title="Error Loading Dashboard" 
           message={error} 
         />
      </MainLayout>
    );
  }

  const getStepNumber = (step: string) => {
    switch (step) {
      case "application":
        return 1;
      case "hrReview":
        return 2;
      case "training":
        return 3;
      case "managerInterview":
        return 4;
      case "salesTask":
        return 5;
      default:
        return 0;
    }
  };

  const getStepStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <Check className="mr-1 h-3 w-3" /> Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="mr-1 h-3 w-3" /> In Progress
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCurrentStepName = () => {
    switch (dashboardState.currentStep) {
      case 1: return "Application and Assessment";
      case 2: return "HR Review and Interview";
      case 3: return "Training";
      case 4: return "Manager Interview";
      case 5: return "Paid Project/Sales Task";
      case 6: return "Hired";
      case 7: return "Process Ended";
      default:
        return "Applied";
    }
  };

  const getCurrentStepDescription = () => {
    switch (dashboardState.currentStep) {
      case 1: return "Complete your application and assessments to demonstrate your skills.";
      case 2: return "Your application is being reviewed by HR. Prepare for an HR interview.";
      case 3: return "Complete all training modules and pass the corresponding quizzes to move to the next step.";
      case 4: return "Prepare for your upcoming interview with a regional manager.";
      case 5: return "Complete your assigned sales tasks to demonstrate your skills in a real-world scenario.";
      case 6: return "Congratulations! You have been hired.";
      case 7: return "Thank you for your application. The process has concluded.";
      default:
        return "Complete your application to begin the hiring process.";
    }
  };

  const getStatusBadge = () => {
    const currentStep = dashboardState.currentStep;
    const candidateStatus = dashboardState.candidateData?.status?.toLowerCase();

    let statusText = "Unknown";
    let statusIcon = <Clock className="mr-1 h-3 w-3" />;
    let badgeClass = "bg-gray-100 text-gray-800";

    if (candidateStatus === 'hired') {
        statusText = "Hired";
        statusIcon = <CheckCircle2 className="mr-1 h-3 w-3" />;
        badgeClass = "bg-green-100 text-green-800";
    } else if (candidateStatus === 'rejected') {
        statusText = "Not Selected";
        statusIcon = <XCircle className="mr-1 h-3 w-3" />;
        badgeClass = "bg-red-100 text-red-800";
    } else {
        switch (currentStep) {
            case 1: statusText = "Application Phase"; badgeClass = "bg-blue-100 text-blue-800"; break;
            case 2: statusText = "HR Review Phase"; badgeClass = "bg-blue-100 text-blue-800"; break;
            case 3: statusText = "Training Phase"; badgeClass = "bg-blue-100 text-blue-800"; break;
            case 4: statusText = "Manager Interview Phase"; badgeClass = "bg-blue-100 text-blue-800"; break;
            case 5: statusText = "Sales Task Phase"; badgeClass = "bg-orange-100 text-orange-800"; break;
            default: statusText = "Applied"; badgeClass = "bg-gray-100 text-gray-800";
        }
    }

        return (
      <Badge className={`${badgeClass} hover:${badgeClass}`}> 
        {statusIcon} {statusText}
          </Badge>
        );
  };

  const showApplicationPrompt = 
    !dashboardState.applicationSubmitted && 
    (dashboardState.candidateData?.status?.toLowerCase() === 'applied' || dashboardState.candidateData?.status?.toLowerCase() === 'screening');

  return (
    <MainLayout>
      <TooltipProvider>
        <div className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidate Dashboard</h1>
          <p className="text-muted-foreground mt-2">
              Welcome back, {profile?.name || 'Candidate'}
          </p>
        </div>

          {showApplicationPrompt && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="text-amber-500 h-5 w-5 mr-2 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">Application Required</h3>
              <p className="text-sm text-amber-700 mt-1">
                You need to complete your application before proceeding with the hiring process.
              </p>
              <Button 
                size="sm" 
                className="mt-3 bg-amber-600 hover:bg-amber-700"
                asChild
              >
                <Link to="/application">
                  Complete Application Now
                </Link>
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Hiring Journey</CardTitle>
                <CardDescription>
                  Track your progress through the hiring process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="flex items-center justify-between mb-8">
                      <div className="w-full absolute top-4 left-0 right-0">
                      <div className="h-1 bg-secondary w-full"></div>
                    </div>
                    {["application", "hrReview", "training", "managerInterview", "salesTask"].map(
                        (stepKey, index) => {
                          const stepNumber = getStepNumber(stepKey);
                          let status = 'pending';
                          if (stepKey === 'application') {
                              status = dashboardState.applicationSubmitted ? 'completed' : (dashboardState.currentStep === 1 ? 'in_progress' : 'pending');
                          } else if (stepNumber < dashboardState.currentStep) {
                              status = 'completed';
                          } else if (stepNumber === dashboardState.currentStep) {
                              status = 'in_progress';
                          } else {
                              status = 'pending';
                          }

                          return (
                        <div
                          key={index}
                          className="relative flex flex-col items-center text-center z-10"
                          style={{ width: "20%" }}
                        >
                             <Tooltip>
                              <TooltipTrigger>
                          <div
                                  className={`flex items-center justify-center h-8 w-8 rounded-full text-sm transition-colors duration-300 ${
                                    status === "completed"
                                ? "bg-green-500 text-white"
                                    : status === "in_progress"
                                    ? "bg-primary text-white ring-2 ring-primary/50 ring-offset-2"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                                  {status === "completed" ? (
                              <Check className="h-5 w-5" />
                            ) : (
                                    stepNumber
                            )}
                          </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="capitalize">
                                    {stepKey.replace(/([A-Z])/g, ' $1')} ({status})
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            <p className={`mt-2 text-xs font-medium ${status !== 'pending' ? 'text-foreground' : 'text-muted-foreground'} capitalize`}>
                                {stepKey.replace(/([A-Z])/g, ' $1')} 
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                  <CardTitle>Training Progress</CardTitle>
                  <CardDescription>Complete modules to unlock the next steps.</CardDescription>
              </CardHeader>
                <CardContent className="space-y-4">
                  {trainingModules.map((module) => (
                    <Link 
                      to="/training"
                      key={module.id} 
                      className={`block p-4 border rounded-lg hover:bg-muted/50 ${module.locked ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{module.title}</span>
                        {getModuleStatusBadge(module.status)}
                        </div>
                        <Progress value={module.progress} className="h-2" />
                                  </Link>
                  ))}
                  {trainingModules.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No training modules available yet.</p>
                  )}
              </CardContent>
                 <CardFooter>
                    <Button onClick={() => navigate('/training')} disabled={isLoadingTraining}>
                        Go to Training Center <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
          </div>

          <div className="md:col-span-4 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Application Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                    {getStatusBadge()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {dashboardState.notifications.length === 0 ? (
                       <p className="text-sm text-muted-foreground text-center py-4">No recent notifications.</p>
                    ) : (
                      dashboardState.notifications.map((log) => (
                        <div
                          key={log.id}
                          className={`p-3 rounded-lg border`}
                    >
                      <p className="text-sm font-medium">
                              {log.action.replace(/_/g, ' ')} - <span className="text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                          </p>
                          {log.details && <p className="text-xs text-muted-foreground">{JSON.stringify(log.details)}</p>}
                        </div>
                      ))
                    )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/application">
                    <FileText className="mr-2 h-4 w-4" />
                      {dashboardState.applicationSubmitted ? "View Application" : "Complete Application"}
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                    disabled={!dashboardState.applicationSubmitted}
                    asChild={dashboardState.applicationSubmitted}
                >
                    {dashboardState.applicationSubmitted ? (
                    <Link to="/training">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Training Center
                    </Link>
                  ) : (
                      <span className="flex items-center text-muted-foreground">
                      <BookOpen className="mr-2 h-4 w-4" />
                        Training Center (Complete App First)
                      </span>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                    disabled={dashboardState.currentStep < 5}
                    asChild={dashboardState.currentStep >= 5}
                  >
                     {dashboardState.currentStep >= 5 ? (
                        <Link to="/sales-task">
                          <Briefcase className="mr-2 h-4 w-4" />
                         </Link>
                      ) : (
                        <span className="flex items-center text-muted-foreground">
                  <Briefcase className="mr-2 h-4 w-4" />
                        Sales Task (Coming Soon)
                      </span>
                    )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        
      </div>
      </TooltipProvider>
    </MainLayout>
  );
};

export default CandidateDashboard;
