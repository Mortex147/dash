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
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [candidateData, setCandidateData] = useState({
    name: "",
    email: "",
    currentStep: 1,
    applicationSubmitted: false,
    status: null,
    stepStatus: {
      application: "pending",
      hrReview: "pending",
      training: "pending",
      managerInterview: "pending",
      salesTask: "pending",
    },
    trainingProgress: 0,
    upcomingDeadline: "2023-10-15",
    notifications: [
      {
        id: 1,
        message: "Complete your application to begin the hiring process",
        date: "Just now",
        read: false,
      }
    ],
  });

  useEffect(() => {
    const fetchCandidateData = async () => {
      if (user && profile) {
        try {
          console.log("Fetching candidate data for user:", user.id);
          setCandidateData(prev => ({
            ...prev,
            name: profile.name || prev.name,
            email: profile.email || prev.email,
          }));

          const { data, error } = await supabase
            .from('candidates')
            .select('*, status')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error("Error fetching candidate data:", error);
            return;
          }

          if (data) {
            console.log("Candidate data retrieved:", data);
            
            const applicationSubmitted = 
              data.resume !== null && 
              data.about_me_video !== null && 
              data.sales_pitch_video !== null;
            
            const stepStatus = {
              application: applicationSubmitted ? "completed" : "pending",
              hrReview: data.current_step >= 2 ? (data.current_step > 2 ? "completed" : "in_progress") : "pending",
              training: data.current_step >= 3 ? (data.current_step > 3 ? "completed" : "in_progress") : "pending",
              managerInterview: data.current_step >= 4 ? (data.current_step > 4 ? "completed" : "in_progress") : "pending",
              salesTask: data.current_step >= 5 ? (data.current_step > 5 ? "completed" : "in_progress") : "pending",
            };

            let trainingProgress = 0;
            switch (data.current_step) {
              case 1: trainingProgress = 0; break;
              case 2: trainingProgress = 0; break;
              case 3: trainingProgress = 60; break;
              case 4: trainingProgress = 100; break;
              case 5: trainingProgress = 100; break;
              default: trainingProgress = 0;
            }

            const notifications = [];
            const currentStatus = data.status?.toLowerCase();
            
            if (!applicationSubmitted && (currentStatus === 'applied' || currentStatus === 'screening')) {
              notifications.push({
                id: 1,
                message: "Complete your application to begin the hiring process",
                date: "Just now",
                read: false,
              });
            } else if (data.current_step === 1) {
              notifications.push({
                id: 1,
                message: "Your application has been submitted and is being reviewed",
                date: "Just now",
                read: false,
              });
            } else if (data.current_step === 2) {
              notifications.push({
                id: 1,
                message: "Your application has been reviewed and approved",
                date: "2 days ago",
                read: true,
              });
              notifications.push({
                id: 2,
                message: "HR interview scheduled for next week",
                date: "1 day ago",
                read: false,
              });
            } else if (data.current_step === 3) {
              notifications.push({
                id: 1,
                message: "You've been approved for training",
                date: "3 days ago",
                read: true,
              });
              notifications.push({
                id: 2,
                message: "New training module available: Product Knowledge",
                date: "2 days ago",
                read: false,
              });
              notifications.push({
                id: 3,
                message: "Quiz reminder: Complete Sales Techniques quiz by Friday",
                date: "5 hours ago",
                read: false,
              });
            } else if (data.current_step === 4) {
              notifications.push({
                id: 1,
                message: "Congratulations! You've completed all training modules",
                date: "3 days ago",
                read: true,
              });
              notifications.push({
                id: 2,
                message: "Manager interview scheduled",
                date: "2 days ago",
                read: false,
              });
            } else if (data.current_step === 5) {
              notifications.push({
                id: 1,
                message: "Manager interview completed successfully!",
                date: "5 days ago",
                read: true,
              });
              notifications.push({
                id: 2,
                message: "Sales task assigned: Visit 3 shops this week",
                date: "1 day ago",
                read: false,
              });
            }

            setCandidateData(prev => ({
              ...prev,
              currentStep: data.current_step || prev.currentStep,
              applicationSubmitted,
              stepStatus,
              trainingProgress,
              notifications,
              status: data.status,
            }));
          }
        } catch (error) {
          console.error("Error in candidate data fetch:", error);
        }
      }
    };

    fetchCandidateData();
  }, [user, profile]);

  useEffect(() => {
    const currentStatus = candidateData.status?.toLowerCase();
    if (
      !candidateData.applicationSubmitted &&
      (currentStatus === 'applied' || currentStatus === 'screening')
    ) {
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
  }, [candidateData.applicationSubmitted, candidateData.status, navigate]);

  const trainingModules = [
    {
      id: 1,
      title: "Product Knowledge",
      description: "Learn about our security products, features, and target customers",
      progress: candidateData.currentStep >= 2 ? 100 : 0,
      status: candidateData.currentStep >= 2 ? "completed" : "locked",
      quizScore: candidateData.currentStep >= 2 ? "85%" : null,
      path: "/training?module=product"
    },
    {
      id: 2,
      title: "Sales Techniques",
      description: "Master effective pitching, objection handling, and closing techniques",
      progress: candidateData.currentStep >= 2 ? (candidateData.currentStep >= 3 ? 100 : 70) : 0,
      status: candidateData.currentStep >= 3 ? "completed" : (candidateData.currentStep >= 2 ? "in_progress" : "locked"),
      quizScore: candidateData.currentStep >= 3 ? "78%" : null,
      path: "/training?module=sales"
    },
    {
      id: 3,
      title: "Retailer Relationships",
      description: "Strategies for building and maintaining relationships with retailers",
      progress: candidateData.currentStep >= 3 ? (candidateData.currentStep >= 4 ? 100 : 50) : 0,
      status: candidateData.currentStep >= 4 ? "completed" : (candidateData.currentStep >= 3 ? "in_progress" : "locked"),
      quizScore: candidateData.currentStep >= 4 ? "92%" : null,
      path: "/training"
    },
  ];

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
            <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
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

  const getModuleStatusBadge = (status: string) => {
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
      case "locked":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Locked
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCurrentStepName = () => {
    switch (candidateData.currentStep) {
      case 1:
        return "Application and Assessment";
      case 2:
        return "HR Review and Interview";
      case 3:
        return "Training";
      case 4:
        return "Manager Interview";
      case 5:
        return "Paid Project/Sales Task";
      default:
        return "Application";
    }
  };

  const getCurrentStepDescription = () => {
    switch (candidateData.currentStep) {
      case 1:
        return "Complete your application and assessments to demonstrate your skills.";
      case 2:
        return "Your application is being reviewed by HR. Prepare for an HR interview.";
      case 3:
        return "Complete all training modules and pass the corresponding quizzes to move to the next step.";
      case 4:
        return "Prepare for your upcoming interview with a regional manager.";
      case 5:
        return "Complete your assigned sales tasks to demonstrate your skills in a real-world scenario.";
      default:
        return "Complete your application to begin the hiring process.";
    }
  };

  const getStatusBadge = () => {
    switch (candidateData.currentStep) {
      case 1:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="mr-1 h-3 w-3" /> Application Phase
          </Badge>
        );
      case 2:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="mr-1 h-3 w-3" /> HR Review Phase
          </Badge>
        );
      case 3:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="mr-1 h-3 w-3" /> Training Phase
          </Badge>
        );
      case 4:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="mr-1 h-3 w-3" /> Manager Interview Phase
          </Badge>
        );
      case 5:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="mr-1 h-3 w-3" /> Sales Task Phase
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="mr-1 h-3 w-3" /> Application Phase
          </Badge>
        );
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidate Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {candidateData.name}
          </p>
        </div>

        {!candidateData.applicationSubmitted && 
         (candidateData.status?.toLowerCase() === 'applied' || candidateData.status?.toLowerCase() === 'screening') && (
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
                    <div className="w-full absolute top-4">
                      <div className="h-1 bg-secondary w-full"></div>
                    </div>
                    {["application", "hrReview", "training", "managerInterview", "salesTask"].map(
                      (step, index) => (
                        <div
                          key={index}
                          className="relative flex flex-col items-center text-center z-10"
                          style={{ width: "20%" }}
                        >
                          <div
                            className={`flex items-center justify-center h-8 w-8 rounded-full text-sm ${
                              candidateData.stepStatus[step as keyof typeof candidateData.stepStatus] === "completed"
                                ? "bg-green-500 text-white"
                                : getStepNumber(step) === candidateData.currentStep
                                ? "bg-primary text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {candidateData.stepStatus[step as keyof typeof candidateData.stepStatus] === "completed" ? (
                              <Check className="h-5 w-5" />
                            ) : (
                              getStepNumber(step)
                            )}
                          </div>
                          <div className="mt-2 max-w-[120px]">
                            <p className="text-xs font-medium mb-1">
                              {step === "application"
                                ? "Application"
                                : step === "hrReview"
                                ? "HR Review"
                                : step === "training"
                                ? "Training"
                                : step === "managerInterview"
                                ? "Manager Interview"
                                : "Sales Task"}
                            </p>
                            <div className="text-xs">
                              {getStepStatusBadge(candidateData.stepStatus[step as keyof typeof candidateData.stepStatus])}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
                  <h4 className="font-medium mb-2">Current Step: {getCurrentStepName()}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {getCurrentStepDescription()}
                  </p>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Overall Progress</span>
                        <span className="text-sm font-medium">
                          {candidateData.applicationSubmitted 
                            ? Math.min(candidateData.currentStep * 20, 100)
                            : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={candidateData.applicationSubmitted ? Math.min(candidateData.currentStep * 20, 100) : 0} 
                        className="h-2" 
                      />
                    </div>
                    
                    {!candidateData.applicationSubmitted ? (
                      <Button size="sm" asChild>
                        <Link to="/application">
                          Complete Application <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    ) : candidateData.currentStep === 3 ? (
                      <Button size="sm" asChild>
                        <Link to="/training">
                          Continue Training <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Training Modules</CardTitle>
                <CardDescription>
                  Complete all modules and quizzes to progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {trainingModules.map((module) => (
                    <div key={module.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-medium text-lg">{module.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {module.description}
                          </p>
                        </div>
                        <div>{getModuleStatusBadge(module.status)}</div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Progress</span>
                          <span className="text-sm font-medium">{module.progress}%</span>
                        </div>
                        <Progress value={module.progress} className="h-2" />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          {module.quizScore && (
                            <div className="flex items-center text-sm text-green-600">
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Quiz Score: {module.quizScore}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          {module.status !== "locked" && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9"
                                asChild
                              >
                                <Link to={module.path}>
                                  <PlayCircle className="mr-1 h-4 w-4" />
                                  {module.status === "completed" ? "Review" : "Continue"}
                                </Link>
                              </Button>
                              {module.status === "in_progress" && (
                                <Button 
                                  size="sm" 
                                  className="h-9"
                                  asChild
                                >
                                  <Link to={`/training/quiz/${module.id === 1 ? 'product' : module.id === 2 ? 'sales' : 'retailer'}`}>
                                    <FileText className="mr-1 h-4 w-4" />
                                    Take Quiz
                                  </Link>
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-4 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Application Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  {candidateData.applicationSubmitted ? (
                    getStatusBadge()
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      <Clock className="mr-1 h-3 w-3" /> Application Pending
                    </Badge>
                  )}
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <CalendarPlus className="text-muted-foreground mr-2 h-5 w-5" />
                  <span className="text-muted-foreground mr-1">Deadline:</span>
                  <span className="font-medium">Oct 15, 2023</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {candidateData.notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border ${
                        !notification.read ? "bg-secondary/50 border-primary/10" : ""
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {notification.message}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-muted-foreground">
                          {notification.date}
                        </span>
                        {!notification.read && (
                          <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" className="w-full">
                  View All Notifications
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  asChild
                >
                  <Link to="/application">
                    <FileText className="mr-2 h-4 w-4" />
                    {candidateData.applicationSubmitted ? "View Application" : "Complete Application"}
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  disabled={!candidateData.applicationSubmitted}
                  asChild={candidateData.applicationSubmitted}
                >
                  {candidateData.applicationSubmitted ? (
                    <Link to="/training">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Training Center
                    </Link>
                  ) : (
                    <>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Training Center (Complete Application First)
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  disabled={candidateData.currentStep < 3}
                >
                  <Briefcase className="mr-2 h-4 w-4" />
                  {candidateData.currentStep >= 3 ? "Sales Task" : "Sales Task (Coming Soon)"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CandidateDashboard;
