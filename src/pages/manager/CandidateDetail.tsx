import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { CalendarRange } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, set } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  Clock,
  FileText,
  Video,
  Phone,
  MapPin,
  Mail,
} from "lucide-react";
import useDatabaseQuery, { updateApplicationStatus, manageInterview } from "@/hooks/useDatabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";

// Define types based on Supabase schema
type Profile = Tables<'profiles'>;
type Candidate = Tables<'candidates'> & { profile: Pick<Profile, 'name' | 'email'> | null };
type AssessmentResult = Tables<'assessment_results'> & { assessment: Pick<Tables<'assessments'>, 'title'> | null };
type ManagerProfile = Pick<Profile, 'id' | 'name'>;

// Helper component to render video link or player
const VideoDisplay = ({ url, title }: { url: string | null | undefined, title: string }) => {
  if (!url) {
    return <p className="text-sm text-muted-foreground">No {title} submitted.</p>;
  }

  // Simple link for now, could be replaced with an embedded player
  return (
    <div>
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-sm text-primary hover:underline flex items-center gap-1"
      >
        <Video className="h-4 w-4" /> Watch {title}
      </a>
    </div>
  );
};

const CandidateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [region, setRegion] = useState('');
  const [selectedManager, setSelectedManager] = useState<string>("");
  const [isAssigningManager, setIsAssigningManager] = useState(false);

  // Log the user object from AuthContext
  console.log("[CandidateDetail] User object:", user);

  const { data: candidateData, isLoading, error: candidateError } = useQuery<Candidate | null>({
    queryKey: ['candidateData', id],
    queryFn: async (): Promise<Candidate | null> => {
      if (!id) return null;
      try {
        const { data, error } = await supabase
          .from('candidates')
          .select(`
            *,
            profile:profiles!candidates_id_fkey(name, email)
          `)
          .eq('id', id)
          .maybeSingle();

        if (error) {
          toast({ 
            variant: "destructive", 
            title: "Error fetching candidate", 
            description: error.message 
          });
          console.error("Error fetching candidate:", error);
          return null;
        }

        return data;
      } catch (err) {
        console.error("Error in candidateData queryFn:", err);
        toast({ 
            variant: "destructive", 
            title: "Error fetching candidate", 
            description: err instanceof Error ? err.message : "An unknown error occurred" 
          });
        return null;
      }
    },
    enabled: !!id,
  });
  
  const { data: managers, isLoading: isLoadingManagers } = useQuery<ManagerProfile[]>({
    queryKey: ['managersList'],
    queryFn: async (): Promise<ManagerProfile[]> => {
      console.log("[CandidateDetail] Fetching managers...");
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'manager');

      if (error) {
        console.error("[CandidateDetail] Error fetching managers:", error.message);
        toast({ 
            variant: "destructive", 
            title: "Error fetching managers", 
            description: error.message 
          });
        return [];
      }
      console.log("[CandidateDetail] Managers fetched:", data);
      return data || [];
    },
    enabled: !!user && (user.role === 'hr' || user.role === 'admin' || user.role === 'director' || user.role === 'authenticated'),
  });

  // Log managers data
  console.log("[CandidateDetail] Managers data:", managers);

  // State for application status update
  const [applicationStatus, setApplicationStatus] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingInfo,setIsUpdatingInfo] = useState(false);
  // Update applicationStatus when candidate data loads
  useEffect(() => {
    if (candidateData) {
      setApplicationStatus(candidateData.status || '');
      setCandidate(candidateData);
      setName(candidateData.profile?.name || '');
      setEmail(candidateData.profile?.email || '');
      setPhone(candidateData.phone || '');
      setLocation(candidateData.location || '');
      setRegion(candidateData.region || '');
      setSelectedManager(candidateData.assigned_manager || "");
      // Log candidate state after it's set
      console.log("[CandidateDetail] Candidate state set:", candidateData);
    } else {
      setApplicationStatus('');
      setCandidate(null);
      setName('');
      setEmail('');
      setPhone('');
      setLocation('');
      setRegion('');
      setSelectedManager('');
      console.log("[CandidateDetail] Candidate data is null or undefined.");
    }
  }, [candidateData]);

  // Handle assigning manager (HR action)
  const handleAssignManager = async () => {
    if (!id || !selectedManager) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Candidate ID or selected manager is missing.",
      });
      return;
    }
    setIsAssigningManager(true);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ assigned_manager: selectedManager })
        .eq('id', id);

      if (error) throw error;

      // Optimistically update local state
      setCandidate((prev: any) => ({ ...prev, assigned_manager: selectedManager }));

      toast({
        title: "Success",
        description: "Manager assigned successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error assigning manager",
        description: error.message,
      });
    } finally {
      setIsAssigningManager(false);
    }
  };

  // Handle editing candidate information
  const handleUpdateCandidate = async () => {
    try {
      if (!id) throw new Error("Candidate ID is missing");
      if (!phone) throw new Error("Phone number is missing");
      if (!location) throw new Error("Location is missing");
      if (!region) throw new Error("Region is missing");
      setIsUpdatingInfo(true);
      const { data, error } = await supabase
        .from('candidates')
        .update({
          phone,
          location,
          region
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Optimistically update the local state
      const updatedCandidate = { ...candidate,  phone, location, region };
      setCandidate(updatedCandidate);

      toast({
        title: "Success",
        description: "Candidate information updated successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "error",
        description: `Failed to update candidate: ${error.message}`,
      });
    }
    finally{
      setIsUpdatingInfo(false);
    }
  };

  // Update application status
  const handleStatusUpdate = async () => {
    setIsUpdatingStatus(true);
    try {
      if (!id) throw new Error("Candidate ID is missing");
      const { data, error } = await updateApplicationStatus(id, { status: applicationStatus });
      if (error) throw error;
    if (!data) throw new Error("Failed to update status");

    // Optimistically update local candidate state
    const updatedData = { 
      ...candidate, 
      status: applicationStatus,
      profile: candidate?.profile 
    };
    
    // Update local state with type assertion
    setCandidate(updatedData as Candidate);

    toast({
      title: "Success",
      description: "Application status updated successfully",
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Failed to update application status";
      
    toast({
      variant: "destructive",
      title: "Error",
      description: errorMessage,
    });
  } finally {
    setIsUpdatingStatus(false);
  }
};

  // State for interview management
  const [interviewAction, setInterviewAction] = useState<'create' | 'update' | 'cancel'>('create');
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [interviewCandidateId, setInterviewCandidateId] = useState(id || '');
  const [interviewManagerId, setInterviewManagerId] = useState('');
  const [interviewScheduledAt, setInterviewScheduledAt] = useState<Date | undefined>(undefined);
  const [interviewStatus, setInterviewStatus] = useState<'scheduled' | 'confirmed' | 'completed' | 'cancelled'>('scheduled');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [isManagingInterview, setIsManagingInterview] = useState(false);

  // State for Project Status update (Manager action)
  const [projectStatus, setProjectStatus] = useState<'not_started' | 'assigned' | 'completed_success' | 'rejected' | 'failed'>('not_started');
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);

  // Fetch Assessment Results for this candidate
  const { data: assessmentResults, isLoading: isLoadingResults } = useQuery<AssessmentResult[]>({
    queryKey: ['candidateAssessmentResults', id],
    queryFn: async (): Promise<AssessmentResult[]> => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('assessment_results')
        .select(`
          *,
          assessment:assessment_id(title)
        `)
        .eq('candidate_id', id);
      
      if (error) {
        console.error("Error fetching assessment results:", error.message);
        toast({
          variant: "destructive",
          title: "Error fetching results",
          description: error.message,
        });
        return [];
      }
      return data || [];
    },
    enabled: !!id,
  });

  // Log assessment results
  console.log("[CandidateDetail] Assessment Results data:", assessmentResults);

  // Effect to set default manager ID when role is manager
  useEffect(() => {
    if (user?.role === 'manager') {
      setInterviewManagerId(user.id || '');
    }
  }, [user]);

  // Effect to set initial project status based on candidate status
   useEffect(() => {
    if (candidate?.status === 'sales_task') {
      setProjectStatus('assigned');
    } else if (candidate?.status === 'hired') {
      setProjectStatus('completed_success');
    } else if (candidate?.status === 'rejected') {
      // Need a way to differentiate rejection reason if needed
      setProjectStatus('rejected'); 
    } else {
      setProjectStatus('not_started');
    }
  }, [candidate?.status]);

  // Manage interview
  const handleInterviewManagement = async () => {
    setIsManagingInterview(true);
    try {
      if (!id) throw new Error("Candidate ID is missing");
      if (!interviewScheduledAt) throw new Error("Scheduled date is missing");

      const interviewData = {
        id: interviewId || undefined,
        candidate_id: interviewCandidateId,
        manager_id: interviewManagerId,
        scheduled_at: interviewScheduledAt.toISOString(),
        status: interviewStatus,
        notes: interviewNotes,
        action: interviewAction,
      };

      const { data, error } = await manageInterview(interviewData);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Interview managed successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to manage interview: ${error.message}`,
      });
    } finally {
      setIsManagingInterview(false);
    }
  };

  // Get status badge component based on status string
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "applied":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            Applied
          </Badge>
        );
      case "screening":
      case "hr_review":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" /> Screening
          </Badge>
        );
      case "hr_approved":
      case "training":
        return (
          <Badge className="bg-purple-100 text-purple-800">
            Training
          </Badge>
        );
      case "sales_task":
        return (
          <Badge className="bg-orange-100 text-orange-800">
            Sales Task
          </Badge>
        );
      case "final_interview":
      case "interview":
        return (
          <Badge className="bg-green-100 text-green-800">
            Interview
          </Badge>
        );
      case "hired":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" /> Hired
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Assign paid project (Manager action)
  const handleAssignProject = async () => {
    setIsUpdatingProject(true);
    try {
      if (!id) throw new Error("Candidate ID is missing");
      // Update candidate status to 'sales_task'
      const { data, error } = await updateApplicationStatus(id, { status: 'sales_task' });
      if (error) throw error;
      if (!data) throw new Error("Failed to assign project");

      // Optimistically update local state
      setCandidate((prev: any) => ({ ...prev, status: 'sales_task' }));
      setProjectStatus('assigned'); // Update local project state

      toast({
        title: "Success",
        description: "Paid project assigned successfully.",
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to assign project";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsUpdatingProject(false);
    }
  };

   // Update project outcome (Manager action)
  const handleUpdateProjectOutcome = async (outcome: 'completed_success' | 'rejected' | 'failed') => {
    setIsUpdatingProject(true);
    let finalStatus: string;
    switch (outcome) {
      case 'completed_success':
        finalStatus = 'hired';
        break;
      case 'rejected':
      case 'failed':
      default:
        finalStatus = 'rejected';
        break;
    }

    try {
      if (!id) throw new Error("Candidate ID is missing");
      // Update candidate status based on outcome
      const { data, error } = await updateApplicationStatus(id, { status: finalStatus });
      if (error) throw error;
      if (!data) throw new Error("Failed to update project outcome");

      // Optimistically update local state
      setCandidate((prev: any) => ({ ...prev, status: finalStatus }));
      setProjectStatus(outcome); // Update local project state

      toast({
        title: "Success",
        description: "Project outcome updated successfully.",
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update project outcome";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsUpdatingProject(false);
    }
  };

  // Get user's role from profile
  const userRole = user?.role === 'authenticated' ? 'director' : user?.role;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-lg text-muted-foreground">Loading candidate details...</p>
        </div>
      </MainLayout>
    );
  }

  if (!candidateData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-lg text-muted-foreground">
            {candidateError ? `Error: ${candidateError.message}` : "Candidate not found."}
          </p>
        </div>
      </MainLayout>
    );
  }

  // Log candidate state just before rendering
  console.log("[CandidateDetail] Candidate state before render:", candidate);

  return (
     <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Candidate Details</h1>
            <p className="text-muted-foreground mt-2">
              Manage candidate application and schedule interviews
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/candidates">
              <ArrowRight className="h-4 w-4 mr-2" /> Back to Candidates
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Details about the candidate's application
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                readOnly />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                readOnly />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div>
                <Select 
                  value={region}
                  onValueChange={(value: string) => setRegion(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="east">East</SelectItem>
                    <SelectItem value="west">West</SelectItem>
                    <SelectItem value="north">North</SelectItem>
                    <SelectItem value="south">South</SelectItem>
                    <SelectItem value="central">Central</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Application Date</Label>
                <Input type="text" value={formatDate(candidateData.updated_at)} readOnly />
              </div>
              <div></div>
              <div>
                <Button onClick={handleUpdateCandidate}>{isUpdatingInfo ? "Saving..." : "Save Changes"}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>
              Update the candidate's application status
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select 
                  value={applicationStatus} 
                  onValueChange={(value: string) => setApplicationStatus(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="screening">Screening</SelectItem>
                    <SelectItem value="hr_review">HR Review</SelectItem>
                    <SelectItem value="hr_approved">HR Approved</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="sales_task">Sales Task</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="final_interview">Final Interview</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button onClick={handleStatusUpdate} disabled={isUpdatingStatus}>
                  {isUpdatingStatus ? "Updating..." : "Update Status"}
                </Button>
              </div>
              <div>
                {getStatusBadge(candidateData.status)}
              </div>
            </div>
          </CardContent>
        </Card>

        {user?.role === 'hr' && (
           <Card>
             <CardHeader>
               <CardTitle>Manager Assignment</CardTitle>
               <CardDescription>
                 Assign a Sales Manager to this candidate.
               </CardDescription>
             </CardHeader>
             <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <Label>Assign Manager</Label>
                 <Select 
                   value={selectedManager} 
                   onValueChange={setSelectedManager}
                   disabled={isLoadingManagers || isAssigningManager}
                 >
                   <SelectTrigger className="w-full">
                     <SelectValue placeholder="Select a manager..." />
                   </SelectTrigger>
                   <SelectContent>
                     {isLoadingManagers ? (
                       <SelectItem value="loading" disabled>Loading...</SelectItem>
                     ) : ( 
                       managers?.map((manager) => (
                         <SelectItem key={manager.id} value={manager.id}>
                           {manager.name}
                         </SelectItem>
                       ))
                     )}
                   </SelectContent>
                 </Select>
               </div>
               <div>
                 <Button 
                   onClick={handleAssignManager} 
                   disabled={!selectedManager || isAssigningManager || candidateData?.assigned_manager === selectedManager}
                   className="mt-6"
                 >
                   {isAssigningManager ? "Assigning..." : "Assign Manager"}
                 </Button>
               </div>
             </CardContent>
           </Card>
        )}

        {(userRole === 'hr' || userRole === 'admin' || userRole === 'director') && (
          <Card>
            <CardHeader>
              <CardTitle>Schedule Interview</CardTitle>
              <CardDescription>
                Schedule or update an interview for the candidate
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Action</Label>
                  <Select 
                    value={interviewAction} 
                    onValueChange={(value: 'create' | 'update' | 'cancel') => setInterviewAction(value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="cancel">Cancel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Manager</Label>
                  <Select 
                    value={interviewManagerId} 
                    onValueChange={setInterviewManagerId}
                    disabled={isLoadingManagers || isManagingInterview}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select interviewing manager..." />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingManagers ? (
                        <SelectItem value="loading" disabled>Loading managers...</SelectItem>
                      ) : ( 
                        managers?.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Scheduled At</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !interviewScheduledAt && "text-muted-foreground"
                        )}
                      >
                        <CalendarRange className="mr-2 h-4 w-4" />
                        {interviewScheduledAt ? (
                          format(interviewScheduledAt, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={interviewScheduledAt}
                        onSelect={setInterviewScheduledAt}
                        disabled={(date) =>
                          date < new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select 
                    value={interviewStatus} 
                    onValueChange={(value: 'scheduled' | 'confirmed' | 'completed' | 'cancelled') => setInterviewStatus(value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea value={interviewNotes} onChange={(e) => setInterviewNotes(e.target.value)} />
                </div>

                <div>
                  <Button onClick={handleInterviewManagement} disabled={isManagingInterview}>
                    {isManagingInterview ? "Managing..." : "Manage Interview"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {user?.role === 'manager' && 
         candidate &&
         (candidate.status === 'hr_approved' || candidate.status === 'training' || candidate.status === 'final_interview' || candidate.status === 'interview') && (
          <Card>
            <CardHeader>
              <CardTitle>Schedule Final Interview</CardTitle>
              <CardDescription>
                Schedule or update the final interview for the candidate.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Action</Label>
                  <Select 
                    value={interviewAction} 
                    onValueChange={(value: 'create' | 'update' | 'cancel') => setInterviewAction(value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="cancel">Cancel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Manager ID (Your ID)</Label>
                  <Input 
                    type="text" 
                    value={interviewManagerId} 
                    readOnly 
                    className="bg-muted/50" 
                  />
                </div>
                <div>
                  <Label>Scheduled At</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !interviewScheduledAt && "text-muted-foreground"
                        )}
                      >
                        <CalendarRange className="mr-2 h-4 w-4" />
                        {interviewScheduledAt ? (
                          format(interviewScheduledAt, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={interviewScheduledAt}
                        onSelect={setInterviewScheduledAt}
                        disabled={(date) =>
                          date < new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={interviewStatus} 
                    onValueChange={(value: 'scheduled' | 'confirmed' | 'completed' | 'cancelled') => setInterviewStatus(value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={interviewNotes} onChange={(e) => setInterviewNotes(e.target.value)} />
                </div>
                <div>
                  <Button onClick={handleInterviewManagement} disabled={isManagingInterview}>
                    {isManagingInterview ? "Managing..." : "Manage Interview"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(user?.role === 'hr' || user?.role === 'manager') && (
          <Card>
            <CardHeader>
              <CardTitle>Assessment & Quiz Results</CardTitle>
              <CardDescription>
                Scores for submitted tests and quizzes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingResults ? (
                <p>Loading results...</p>
              ) : assessmentResults && assessmentResults.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assessment/Quiz</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Completed On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>{result.assessment?.title || 'N/A'}</TableCell>
                        <TableCell>{result.score}%</TableCell>
                        <TableCell>
                          {result.completed ? (
                            <Badge className="bg-green-100 text-green-800">Completed</Badge>
                          ) : (
                            <Badge variant="outline">In Progress</Badge>
                          )}
                        </TableCell>
                        <TableCell>{result.completed_at ? formatDate(result.completed_at) : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No assessment or quiz results found.</p>
              )}
            </CardContent>
          </Card>
        )}

        {(user?.role === 'hr' || user?.role === 'manager') && candidate && (candidate.about_me_video || candidate.sales_pitch_video) && (
          <Card>
            <CardHeader>
              <CardTitle>Video Submissions</CardTitle>
              <CardDescription>
                Review the candidate's submitted videos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                 <Label className="font-medium">About Me Video</Label>
                 <VideoDisplay url={candidate.about_me_video} title="About Me Video" />
               </div>
               <div>
                 <Label className="font-medium">Sales Pitch Video</Label>
                 <VideoDisplay url={candidate.sales_pitch_video} title="Sales Pitch Video" />
               </div>
            </CardContent>
          </Card>
        )}

        {user?.role === 'manager' && 
         candidate &&
         (candidate.status === 'final_interview' || candidate.status === 'sales_task' || candidate.status === 'hired' || candidate.status === 'rejected') && (
          <Card>
            <CardHeader>
              <CardTitle>Paid Project Assignment & Status</CardTitle>
              <CardDescription>
                Assign the paid project and update its final status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {projectStatus === 'not_started' && candidate.status === 'final_interview' && (
                 <Button 
                   onClick={handleAssignProject} 
                   disabled={isUpdatingProject}
                 >
                   {isUpdatingProject ? "Assigning..." : "Assign Paid Project"}
                 </Button>
              )}

              {projectStatus === 'assigned' && (
                <div className="flex items-center gap-4">
                  <Badge variant="outline">Project Assigned</Badge>
                  <Select 
                     onValueChange={(value: 'completed_success' | 'rejected' | 'failed') => {
                       handleUpdateProjectOutcome(value);
                     }}
                     disabled={isUpdatingProject}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Update Project Outcome..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed_success">Completed Successfully (Hire)</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>                      
                    </SelectContent>
                  </Select>
                   {isUpdatingProject && <span className="text-sm text-muted-foreground">Updating...</span>}
                </div>
              )}

              {projectStatus === 'completed_success' && (
                 <Badge className="bg-green-100 text-green-800">
                   <CheckCircle className="mr-1 h-3 w-3" /> Project Completed (Hired)
                 </Badge>
              )}
               {(projectStatus === 'rejected' || projectStatus === 'failed') && (
                 <Badge className="bg-red-100 text-red-800">
                   <XCircle className="mr-1 h-3 w-3" /> Project Not Passed (Rejected)
                 </Badge>
              )}

            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default CandidateDetail;
