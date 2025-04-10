import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, TrendingUp, Users, CalendarClock, Info } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardStats from "@/components/dashboard/DashboardStats";
import CandidateList from "@/components/dashboard/CandidateList";
import InterviewList from "@/components/dashboard/InterviewList";
import RecentResultsList from "@/components/dashboard/RecentResultsList";
import { Interview, AssessmentWithStats } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// Define types directly based on expected query results
// Adjust Candidate type to handle potential inconsistencies in nested profiles
type Candidate = Database['public']['Tables']['candidates']['Row'] & {
   profiles?: any | null // Use any for profiles to bypass strict Supabase return type issues
};
// SupabaseInterview includes the potentially nested candidate
type SupabaseInterview = Database['public']['Tables']['interviews']['Row'] & { candidates: Candidate | null };

// Define a type for the Director's view of assessment results
type DirectorAssessmentEntry = {
  id: string; // Result ID
  assessmentTitle: string;
  candidateName: string;
  score: number | null;
  completed: boolean;
  completedAt: string | null;
};

const DirectorDashboard = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all-candidates");

  // Fetch ALL candidates (including Closed)
  const { data: allCandidates, isLoading: isLoadingCandidates } = useQuery<Candidate[], Error>({
    queryKey: ['allCandidatesDirector'],
    queryFn: async (): Promise<Candidate[]> => {
      console.log("DirectorDashboard: Fetching ALL candidates...");
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          *,
          profiles!candidates_id_fkey(*)
        `)
        .order('updated_at', { ascending: false });

      console.log("DirectorDashboard: ALL Candidates query result:", { data, error });

      if (error) {
        console.error("Error fetching all candidates:", error);
        toast({ title: "Error fetching all candidates", description: error.message, variant: "destructive" });
        throw new Error(error.message);
      }
      return (data || []) as Candidate[]; 
    },
  });

  // Fetch ALL upcoming interviews and map to Interview type
  const { data: upcomingInterviews, isLoading: isLoadingInterviews } = useQuery<Interview[], Error>({
    queryKey: ['allUpcomingInterviews'],
    queryFn: async (): Promise<Interview[]> => {
      console.log("DirectorDashboard: Fetching all upcoming interviews...");
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          candidates!inner (
            *,
            profiles!candidates_id_fkey(*)
          )
        `)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      console.log("DirectorDashboard: Interviews query result:", { data, error });

      if (error) {
        console.error("Error fetching interviews:", error);
        toast({ title: "Error fetching interviews", description: error.message, variant: "destructive" });
        throw new Error(error.message);
      }
      
      // Cast intermediate data to any[] before mapping if direct cast fails
      const supabaseData = (data || []) as any[]; 
      const mappedData = supabaseData.map((interview): Interview => ({
        id: interview.id,
        candidateId: interview.candidate_id,
        candidateName: interview.candidates?.profiles?.name ?? 'Unknown Candidate',
        candidateEmail: interview.candidates?.profiles?.email ?? undefined,
        managerId: interview.manager_id ?? '',
        scheduledAt: interview.scheduled_at,
        status: interview.status as Interview['status'], 
      }));
      return mappedData;
    },
  });

  // Fetch recent assessment results for the Director view
  const { data: recentAssessmentResults, isLoading: isLoadingAssessments } = useQuery<DirectorAssessmentEntry[], Error>({
      queryKey: ['directorRecentAssessmentResults'],
      queryFn: async (): Promise<DirectorAssessmentEntry[]> => {
        console.log("DirectorDashboard: Fetching recent assessment results...");
        const { data, error } = await supabase
          .from('assessment_results')
          .select(`
            id, 
            score,
            completed,
            completed_at,
            assessments!inner ( title ), 
            candidates!inner (
              profiles!candidates_id_fkey ( name )
            )
          `)
          .order('completed_at', { ascending: false, nullsFirst: false })
          .limit(50);
  
        console.log("DirectorDashboard: Assessment results query result:", { data, error });

        if (error) {
          console.error("Error fetching assessment results:", error);
          toast({ title: "Error fetching assessment results", description: error.message, variant: "destructive" });
          throw new Error(error.message);
        }
        
        const supabaseData = (data || []) as any[];
        const mappedResults = supabaseData.map((result): DirectorAssessmentEntry => ({
          id: result.id,
          assessmentTitle: result.assessments?.title ?? 'Unknown Assessment',
          candidateName: result.candidates?.profiles?.name ?? 'Unknown Candidate',
          score: result.score,
          completed: result.completed,
          completedAt: result.completed_at,
        }));

        return mappedResults;
      },
    });

  // Combined loading state
  const isLoading = isLoadingCandidates || isLoadingInterviews || isLoadingAssessments;

  const dashboardStats = useMemo(() => {
    // Define statuses considered "pending review" for the Director
    const pendingReviewStatuses = ['hr_approved', 'final_interview'];
    
    const candidatesForStats = allCandidates || [];
    
    const pendingReviewsCount = candidatesForStats.filter(c => 
      pendingReviewStatuses.includes(c.status?.toLowerCase() ?? '')
    ).length;

    return {
      totalActiveCandidates: candidatesForStats.filter(c => c.status !== 'Closed').length ?? 0,
      totalCandidates: candidatesForStats.length ?? 0,
      pendingReviews: pendingReviewsCount, // Calculate pending reviews
      interviewsScheduled: upcomingInterviews?.length ?? 0,
    };
  }, [allCandidates, upcomingInterviews]);

  return (
    <MainLayout>
       <div className="space-y-8">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Director Dashboard</h1>
           <p className="text-muted-foreground mt-2">
              Overview of all candidates, interviews, and assessments.
           </p>
         </div>
        
        <DashboardStats
          totalCandidates={dashboardStats.totalCandidates}
          pendingReviews={dashboardStats.pendingReviews}
          interviewsScheduled={dashboardStats.interviewsScheduled}
          isLoading={isLoading}
        />

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all-candidates">All Candidates</TabsTrigger>
            <TabsTrigger value="upcoming-interviews">Upcoming Interviews</TabsTrigger>
            <TabsTrigger value="recent-assessments">Recent Assessments</TabsTrigger>
          </TabsList>

          <TabsContent value="all-candidates">
            <CandidateList
              candidates={allCandidates || []}
              isLoading={isLoadingCandidates}
              role="Director" 
            />
          </TabsContent>

          <TabsContent value="upcoming-interviews">
            <InterviewList
              interviews={upcomingInterviews || []} 
              isLoading={isLoadingInterviews} 
            />
          </TabsContent>

          <TabsContent value="recent-assessments">
             {/* Use the new component designed for assessment results */}
            <RecentResultsList 
              results={recentAssessmentResults || []} 
              isLoading={isLoadingAssessments} 
            />
          </TabsContent>
        </Tabs>

        
       </div>
    </MainLayout>
  );
};

export default DirectorDashboard; 