import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import DashboardStats from "@/components/dashboard/DashboardStats";
import CandidateList from "@/components/dashboard/CandidateList";
import InterviewList from "@/components/dashboard/InterviewList";
import AssessmentList from "@/components/dashboard/AssessmentList";
import { Interview, AssessmentWithStats } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

// Type for the raw data fetched, including profile
type RawCandidateData = Database['public']['Tables']['candidates']['Row'] & {
  candidate_profile: Database['public']['Tables']['profiles']['Row'] | null;
  assessment_results: Pick<Database['public']['Tables']['assessment_results']['Row'], 'score' | 'completed' | 'completed_at'>[] | null;
};

// Type for the raw interview data fetched
type RawInterview = Database['public']['Tables']['interviews']['Row'] & {
  candidate: {
      id: string;
      profile: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'name' | 'email'> | null;
  } | null;
};

const ManagerDashboard = ({ role }: { role: string }) => {
  console.log('ManagerDashboard received role:', role);
  const { user, profile } = useAuth(); // Need profile for role checks
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("assigned-candidates"); // Default to new tab name
  const lowerCaseRole = role?.toLowerCase(); // Calculate role once

  // --- Query 1: Fetch candidate data relevant to this dashboard tab ---
  // (Fetches ALL assigned for manager, or specific statuses for others)
  const { data: rawAssignedCandidatesData, isLoading: isLoadingAssignedCandidates } = useQuery<RawCandidateData[]>({
    queryKey: ['dashboardAssignedCandidates', role, lowerCaseRole === 'manager' ? user?.id : null],
    queryFn: async () => {
      const managerId = lowerCaseRole === 'manager' ? user?.id : null;
      if (lowerCaseRole === 'manager' && !managerId) {
        console.log("[ManagerDashboard] Manager role, no ID, skipping assigned query.");
        return [];
      }

      try {
        // Status filter logic (only applies if NOT manager)
        let relevantStatuses: string[] = [];
        if (lowerCaseRole === 'hr') {
          relevantStatuses = ['applied', 'hr_review'];
        } else if (lowerCaseRole !== 'manager') { // Director/Admin see all pending
           relevantStatuses = ['applied', 'hr_review', 'hr_approved', 'training', 'final_interview'];
        }

        let query = supabase
          .from('candidates')
          .select(`
            id,
            status,
            current_step,
            updated_at,
            candidate_profile:profiles!candidates_id_fkey(id, name, email, role),
            assessment_results(score, completed, completed_at)
          `);

        // Apply status filter ONLY for non-managers who have relevant statuses defined
        if (lowerCaseRole !== 'manager' && relevantStatuses.length > 0) {
           query = query.in('status', relevantStatuses);
        }

        // Apply manager assignment filter ONLY for managers
        if (lowerCaseRole === 'manager' && managerId) {
            query = query.eq('assigned_manager', managerId);
        }

        const { data, error } = await query.order('updated_at', { ascending: false });

        console.log('[ManagerDashboard] RAW Assigned/Pending query result:', { data: data?.length, error });
        console.log('[ManagerDashboard] RAW Supabase response for assigned/pending list:', data);
        
        if (error) {
          toast({ variant: "destructive", title: "Error fetching dashboard candidates", description: error.message });
          throw error;
        }
        return (data || []) as RawCandidateData[];
      } catch (err) {
        console.error("Error in dashboard candidates query:", err);
        return [];
      }
    },
    enabled: !!user // Enable query if user is logged in
  });

  // --- Client-Side Filter for actual candidates ---
  const assignedCandidates = useMemo(() => {
      return (rawAssignedCandidatesData || []).filter(c => c?.candidate_profile?.role === 'candidate');
  }, [rawAssignedCandidatesData]);

  // --- Query 2: Get count of ALL active candidates assigned to the manager ---
  const { data: totalAssignedCount, isLoading: isLoadingTotalCount } = useQuery<number>({
    queryKey: ['totalAssignedCandidatesCountManager', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_manager', user.id)
        .not('status', 'in', '("hired", "rejected")'); // Count active candidates

      if (error) {
        console.error("Error fetching total assigned count:", error);
        return 0; // Don't toast, just return 0 on error
      }
      console.log(`[ManagerDashboard] Total assigned count for manager ${user.id}:`, count);
      return count ?? 0;
    },
    // Run this query ONLY if the role is 'manager' and user ID exists
    enabled: lowerCaseRole === 'manager' && !!user?.id,
  });

  // --- Query 3: Fetch upcoming interviews ---
  const { data: upcomingInterviewsRaw, isLoading: isLoadingInterviews } = useQuery<RawInterview[]>({
    queryKey: ['upcomingInterviewsDashboard', role, lowerCaseRole === 'manager' ? user?.id : null],
    queryFn: async () => {
      const managerId = lowerCaseRole === 'manager' ? user?.id : null;
       if (lowerCaseRole === 'manager' && !managerId) return [];

      try {
        let interviewQuery = supabase
          .from('interviews')
          .select(`
            id,
            scheduled_at,
            status,
            candidate_id,
            candidate:candidates!interviews_candidate_id_fkey(id, profile:profiles!candidates_id_fkey(id, name, email))
          `)
          .in('status', ['scheduled', 'confirmed'])
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(5);
        
        if (lowerCaseRole === 'manager' && managerId) {
          interviewQuery = interviewQuery.eq('manager_id', managerId);
        }

        const { data, error } = await interviewQuery;

        console.log('[ManagerDashboard] Interviews query result:', { data: data?.length, error });

        if (error) {
          toast({ variant: "destructive", title: "Error fetching interviews", description: error.message });
          throw error;
        }
        return (data || []) as RawInterview[];
      } catch (err) {
        console.error("Error in upcomingInterviews query:", err);
        return [];
      }
    },
     enabled: !!user
  });

  // --- Process Interview Data ---
  const upcomingInterviews: Interview[] = useMemo(() => {
    return (upcomingInterviewsRaw || []).map((interview) => ({
      id: interview.id,
      candidateId: interview.candidate_id,
      candidateName: interview.candidate?.profile?.name ?? "Unknown Candidate",
      candidateEmail: interview.candidate?.profile?.email ?? "Unknown Email",
      managerId: interview.manager_id ?? "",
      scheduledAt: interview.scheduled_at,
      status: interview.status as Interview['status'],
    }));
  }, [upcomingInterviewsRaw]);

  // --- Query 4: Fetch recent assessments summaries ---
  const { data: recentAssessments, isLoading: isLoadingAssessments } = useQuery<AssessmentWithStats[]>({
    queryKey: ['recentAssessmentsManagerDashboard'],
    queryFn: async () => {
      try {
        const { data: assessmentsData, error: assessmentError } = await supabase
          .from('assessments')
          .select('id, title, difficulty, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5); // Limit the number of assessments fetched

        if (assessmentError) throw assessmentError;
        if (!assessmentsData) return [];

        const statsPromises = assessmentsData.map(async (assessment) => {
          const { data: resultsData, error: resultsError } = await supabase
            .from('assessment_results')
            .select('score')
            .eq('assessment_id', assessment.id)
            .not('score', 'is', null);
          
          if (resultsError) {
            console.error(`Error fetching results for assessment ${assessment.id}:`, resultsError);
            return { ...assessment, avgScore: 0, submissions: 0 };
          }

          const scores = resultsData.map(r => r.score).filter(s => typeof s === 'number'); // Ensure scores are numbers
          const avgScore = scores.length > 0 
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
            : 0;
          
          return {
            ...assessment,
            avgScore,
            submissions: scores.length
          };
        });

        const assessmentsWithStats = await Promise.all(statsPromises);
        console.log('[ManagerDashboard] Recent Assessments with stats:', assessmentsWithStats);
        return assessmentsWithStats;

      } catch (err) {
        console.error("Error in recentAssessments query:", err);
        toast({ variant: "destructive", title: "Error fetching assessments", description: err instanceof Error ? err.message : "Unknown error" });
        return [];
      }
    },
     enabled: !!user // Enable query if user is logged in
  });

  // --- Calculate dashboard stats ---
  const dashboardStats = useMemo(() => {
    // Base total count on totalAssignedCount ONLY if manager, otherwise use the length of the candidates shown in the first tab
    const totalToShow = lowerCaseRole === 'manager' ? totalAssignedCount : assignedCandidates.length;

    // Calculate pending reviews count based on FILTERED assignedCandidates list for managers
    // Or based on the raw list for others (since raw list is already filtered by status for them)
    const listForPendingCount = lowerCaseRole === 'manager' ? assignedCandidates : (rawAssignedCandidatesData || []);
    const pendingStatuses = lowerCaseRole === 'manager'
        ? ['hr_approved', 'training', 'final_interview']
        : lowerCaseRole === 'hr'
        ? ['applied', 'hr_review']
        : ['applied', 'hr_review', 'hr_approved', 'training', 'final_interview']; // Default/Director/Admin

    const pendingReviewsCount = listForPendingCount.filter(c =>
        c?.candidate_profile?.role === 'candidate' && // Double check role here just in case
        pendingStatuses.includes(c.status?.toLowerCase() ?? '')
    ).length;

    const interviewsCount = upcomingInterviews.length;

    return {
      totalCandidates: totalToShow ?? 0,
      pendingReviews: pendingReviewsCount,
      interviewsScheduled: interviewsCount,
    };
  }, [
      lowerCaseRole,
      assignedCandidates, // Use filtered list
      rawAssignedCandidatesData, // Use raw list for non-managers pending calc
      upcomingInterviews,
      totalAssignedCount // Use count query result
  ]);

  // --- Get next interview date ---
  const nextInterviewDate = upcomingInterviews.length > 0
    ? upcomingInterviews[0].scheduledAt
    : undefined;

  // --- Combined loading state ---
  const isLoading = isLoadingAssignedCandidates || isLoadingInterviews || isLoadingAssessments || (lowerCaseRole === 'manager' && isLoadingTotalCount);

  // --- Render Component ---
  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          {/* Use profile name if available, fallback to role */}
          <h1 className="text-3xl font-bold tracking-tight">{`${profile?.name || role} Dashboard`}</h1>
          <p className="text-muted-foreground mt-2">
            Focus on your most important tasks: reviewing candidates and upcoming interviews
          </p>
        </div>

        <DashboardStats
          totalCandidates={dashboardStats.totalCandidates}
          pendingReviews={dashboardStats.pendingReviews}
          interviewsScheduled={dashboardStats.interviewsScheduled}
          nextInterviewDate={nextInterviewDate}
          isLoading={isLoading}
        />

        <Tabs defaultValue="assigned-candidates" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="assigned-candidates">Assigned Candidates</TabsTrigger>
            <TabsTrigger value="upcoming-interviews">Upcoming Interviews</TabsTrigger>
            <TabsTrigger value="recent-assessments">Recent Assessments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assigned-candidates">
            {/* Pass the FILTERED candidate list */}
            <CandidateList 
              candidates={assignedCandidates}
              isLoading={isLoadingAssignedCandidates} // Use loading state from the primary query
              role={role}
            />
          </TabsContent>
          
          <TabsContent value="upcoming-interviews">
            <InterviewList 
              interviews={upcomingInterviews}
              isLoading={isLoadingInterviews} // Use specific loading state
            />
          </TabsContent>
          
          <TabsContent value="recent-assessments">
            {/* Assuming AssessmentList handles AssessmentWithStats[] */}
            <AssessmentList 
              assessments={recentAssessments || []} 
              isLoading={isLoadingAssessments} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ManagerDashboard;

