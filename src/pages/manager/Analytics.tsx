import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart as LucideBarChart,
  LineChart as LucideLineChart,
  PieChart,
  ArrowUp,
  ArrowDown,
  Users,
  CheckCircle2,
  XCircle,
  UserCheck,
  TrendingUp,
  Activity
} from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, formatISO } from 'date-fns';
import {
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  Bar,
  Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

const Analytics = () => {
  // Fetch data for KPIs
  const { data: kpiData, isLoading: isLoadingKpi } = useQuery({
    queryKey: ['analyticsKpiDataWithChange'],
    queryFn: async () => {
      const now = new Date();
      const startOfCurrentMonth = formatISO(startOfMonth(now));
      const endOfCurrentMonth = formatISO(endOfMonth(now));
      const startOfPreviousMonth = formatISO(startOfMonth(subMonths(now, 1)));
      const endOfPreviousMonth = formatISO(endOfMonth(subMonths(now, 1)));
      
      // --- Fetch counts --- 
      const { count: totalActiveCandidates, error: errorActive } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'Closed');

      const { count: applicationsThisMonth, error: errorApps } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', startOfCurrentMonth)
        .lte('updated_at', endOfCurrentMonth);
        
      const { count: hiredThisMonth, error: errorHired } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'hired')
        .gte('updated_at', startOfCurrentMonth)
        .lte('updated_at', endOfCurrentMonth);

      // --- Fetch previous month counts --- 
      const { count: totalActiveCandidatesPrev, error: errorActivePrev } = await supabase
          .from('candidates')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'Closed'); // Same logic as current, maybe needs refinement based on definition

      const { count: applicationsPrevMonth, error: errorAppsPrev } = await supabase
          .from('candidates')
          .select('*', { count: 'exact', head: true })
          .gte('updated_at', startOfPreviousMonth)
          .lte('updated_at', endOfPreviousMonth);

      const { count: hiredPrevMonth, error: errorHiredPrev } = await supabase
          .from('candidates')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'hired')
          .gte('updated_at', startOfPreviousMonth)
          .lte('updated_at', endOfPreviousMonth);

      // --- Fetch TOTAL counts --- 
      const { count: totalHired, error: errorTotalHired } = await supabase
          .from('candidates')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'hired');

      const { count: totalRejected, error: errorTotalRejected } = await supabase
          .from('candidates')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'rejected'); // Assuming 'rejected' is the status to count

      // Handle potential errors for all fetches
      const allErrors = { 
          errorActive, errorApps, errorHired, 
          errorActivePrev, errorAppsPrev, errorHiredPrev,
          errorTotalHired, errorTotalRejected // Add new errors here
      };
      if (Object.values(allErrors).some(e => e !== null)) {
          console.error("Error fetching KPI data:", allErrors);
          throw new Error('Failed to fetch KPI data');
      }

      return {
          totalActiveCandidates: totalActiveCandidates ?? 0,
          applicationsThisMonth: applicationsThisMonth ?? 0,
          hiredThisMonth: hiredThisMonth ?? 0,
          totalActiveCandidatesPrev: totalActiveCandidatesPrev ?? 0,
          applicationsPrevMonth: applicationsPrevMonth ?? 0,
          hiredPrevMonth: hiredPrevMonth ?? 0,
          totalHired: totalHired ?? 0, // Add total hired
          totalRejected: totalRejected ?? 0, // Add total rejected
      };
    }
  });

  // Calculate derived metrics
  const calculatedMetrics = useMemo(() => {
    if (!kpiData) {
        return {
            totalCandidates: 0,
            applicationsThisMonth: 0,
            hiredThisMonth: 0,
            conversionRate: 0,
            totalCandidatesChange: 0,
            applicationsThisMonthChange: 0,
            hiredThisMonthChange: 0,
            conversionRateChange: 0,
        };
    }

    const conversionRate = kpiData.applicationsThisMonth > 0 
        ? parseFloat(((kpiData.hiredThisMonth / kpiData.applicationsThisMonth) * 100).toFixed(1))
        : 0;
    const conversionRatePrev = kpiData.applicationsPrevMonth > 0 
        ? parseFloat(((kpiData.hiredPrevMonth / kpiData.applicationsPrevMonth) * 100).toFixed(1)) 
        : 0;
    
    // Calculate % change (handle division by zero)
    const calcChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0; // Assign 100% increase if prev was 0 and current > 0, else 0%
        return Math.round(((current - previous) / previous) * 100);
    };

    return {
        totalCandidates: kpiData.totalActiveCandidates,
        applicationsThisMonth: kpiData.applicationsThisMonth,
        hiredThisMonth: kpiData.hiredThisMonth,
        conversionRate: conversionRate,
        totalCandidatesChange: calcChange(kpiData.totalActiveCandidates, kpiData.totalActiveCandidatesPrev),
        applicationsThisMonthChange: calcChange(kpiData.applicationsThisMonth, kpiData.applicationsPrevMonth),
        hiredThisMonthChange: calcChange(kpiData.hiredThisMonth, kpiData.hiredPrevMonth),
        conversionRateChange: conversionRatePrev === 0 ? (conversionRate > 0 ? 100 : 0) : Math.round(((conversionRate - conversionRatePrev) / conversionRatePrev) * 100)
    }
  }, [kpiData]);

  // --- Recruitment Funnel Data --- 
  // Define funnel stages and corresponding statuses (USE LOWERCASE)
  const funnelStages = [
    // Assuming all these statuses mean the candidate started the process
    { name: 'Applied', statuses: ['applied', 'screening', 'hr_review', 'hr_approved', 'training', 'sales_task', 'interview', 'final_interview', 'hired', 'rejected'] }, 
    // Assuming hr_approved means passed screening
    { name: 'Screening Passed', statuses: ['hr_approved', 'training', 'sales_task', 'interview', 'final_interview', 'hired'] }, 
    // Assuming reaching sales_task means training is done (adjust if quiz completion is needed)
    { name: 'Training Completed', statuses: ['sales_task', 'interview', 'final_interview', 'hired'] }, 
    // Assuming reaching interview means sales task passed (needs verification)
    { name: 'Sales Task Passed', statuses: ['interview', 'final_interview', 'hired'] }, 
    // Only count explicitly 'hired' status
    { name: 'Interview Passed (Hired)', statuses: ['hired'] },
  ];

  // Fetch all non-closed candidates for funnel calculation
  const { data: funnelCandidatesData, isLoading: isLoadingFunnel } = useQuery({
    queryKey: ['analyticsFunnelCandidates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, status')
        // IMPORTANT: Verify which statuses mean 'out of funnel'. 
        // If 'rejected' means out, exclude it here too.
        .not('status', 'in', '("Closed", "rejected")'); // Example: Exclude Closed AND rejected

      if (error) {
        console.error("Error fetching funnel candidate data:", error);
        throw new Error('Failed to fetch funnel data');
      }
      return data || [];
    }
  });

  // Calculate funnel progression and rates
  const calculatedFunnelData = useMemo(() => {
    if (!funnelCandidatesData || funnelCandidatesData.length === 0) {
      return funnelStages.map(stage => ({ name: stage.name, value: 0, count: 0, stageToStageRate: 0 }));
    }

    const stageCounts = funnelStages.map(stage => {
      const count = funnelCandidatesData.filter(c => stage.statuses.includes(c.status)).length;
      return { name: stage.name, count };
    });

    // Calculate pass rates relative to the 'Applied' stage (total entering the funnel considered here)
    const totalApplied = stageCounts.find(s => s.name === 'Applied')?.count ?? 0;

    const funnelWithRates = stageCounts.map((stage, index) => {
      let value = 0;
      if (totalApplied > 0) {
         // Calculate percentage relative to the initial 'Applied' count
         value = parseFloat(((stage.count / totalApplied) * 100).toFixed(1));
      }
      // For stage-to-stage conversion (alternative view, shown in Funnel Tab)
      let stageToStageRate = 0;
      if (index > 0) {
          const prevStageCount = stageCounts[index - 1].count;
          if (prevStageCount > 0) {
              stageToStageRate = parseFloat(((stage.count / prevStageCount) * 100).toFixed(1));
          }
      } else {
          stageToStageRate = 100; // First stage always 100% of itself
      }

      return { ...stage, value, stageToStageRate };
    });

    return funnelWithRates;

  }, [funnelCandidatesData]);

  // --- Bottleneck Calculation ---
  const bottleneckStage = useMemo(() => {
    if (isLoadingFunnel || !calculatedFunnelData || calculatedFunnelData.length <= 1) {
      return null; // Not enough data or still loading
    }
    // Find the stage (after 'Applied') with the minimum stageToStageRate
    let minRate = 101; // Start higher than 100
    let bottleneck = null;

    // Start from index 1 to compare stage-to-stage rates
    for (let i = 1; i < calculatedFunnelData.length; i++) {
      if (calculatedFunnelData[i].stageToStageRate < minRate) {
        minRate = calculatedFunnelData[i].stageToStageRate;
        bottleneck = {
          name: calculatedFunnelData[i].name,
          prevStageName: calculatedFunnelData[i-1].name,
          rate: minRate
        };
      }
    }
    return bottleneck;
  }, [calculatedFunnelData, isLoadingFunnel]);

  // --- Assessment Performance Data --- 
  // Define assessment stages based on assumed titles
  const assessmentStages = [
    "Initial Screening",
    "Product Knowledge",
    "Sales Techniques",
    "Objection Handling",
    "Final Assessment",
  ];

  // Fetch assessment results data
  const { data: assessmentResultsData, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['analyticsAssessmentResults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_results')
        .select(`
          score,
          assessment_id,
          answers,
          assessments ( title ) 
        `)
        .not('score', 'is', null); // Only consider completed assessments with scores

      if (error) {
        console.error("Error fetching assessment results data:", error);
        throw new Error('Failed to fetch assessment data');
      }
      return data || [];
    }
  });

  // Calculate assessment performance metrics
  const calculatedAssessmentPerformance = useMemo(() => {
    if (!assessmentResultsData) return [];

    console.log('Raw Assessment Results Data:', assessmentResultsData); // Log raw data

    const performanceData: Record<string, { totalScore: number; count: number; title: string }> = {};

    assessmentResultsData.forEach(result => {
      const assessmentId = result.assessment_id;
      const score = result.score;
      // @ts-ignore // Ignore potential TS warning for accessing nested property
      const title = result.assessments?.title || 'Unknown Assessment'; // Safely access title

      if (assessmentId && typeof score === 'number' && !isNaN(score)) {
        if (!performanceData[assessmentId]) {
          performanceData[assessmentId] = { totalScore: 0, count: 0, title: title };
        }
        performanceData[assessmentId].totalScore += score;
        performanceData[assessmentId].count += 1;
      }
    });

    console.log('Aggregated Performance Data:', performanceData); // Log aggregated data

    const calculatedData = Object.entries(performanceData).map(([id, data]) => ({
      id: id,
      name: data.title,
      average_score: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
      submissions: data.count,
      // Keep avgScore for the progress bar component if needed
      avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0, 
    }));

    console.log('Final Calculated Assessment Performance:', calculatedData); // Log final data
    return calculatedData;

  }, [assessmentResultsData]);

  // --- Hiring Trends Data ---
  // Fetch candidate and hire counts grouped by month for the last 12 months
  const { data: trendsData, isLoading: isLoadingTrends } = useQuery({
    queryKey: ['analyticsHiringTrends'],
    queryFn: async () => {
      const twelveMonthsAgo = formatISO(subMonths(new Date(), 11), { representation: 'date' }); // Start of the 12-month period

      // Fetch all relevant candidates created or hired in the last 12 months
      const { data, error } = await supabase
          .from('candidates')
          // Select only existing and needed columns
          .select('updated_at, status') 
          .gte('updated_at', twelveMonthsAgo); // Filter by updated_at instead of created_at

      if (error) {
          console.error("Error fetching hiring trends data:", error);
          throw new Error('Failed to fetch hiring trends data');
      }
      
      // Process data client-side to group by month
      const monthlyCounts: { [key: string]: { candidates: number, hires: number } } = {};
      const monthLabels: string[] = [];
      const currentDate = new Date();

      // Initialize counts for the last 12 months
      for (let i = 11; i >= 0; i--) {
          const date = subMonths(currentDate, i);
          const monthKey = formatISO(date, { representation: 'date' }).substring(0, 7); // YYYY-MM format
          monthlyCounts[monthKey] = { candidates: 0, hires: 0 };
          monthLabels.push(date.toLocaleString('default', { month: 'short' })); // 'Jan', 'Feb', etc.
      }

      // Populate counts
      (data || []).forEach(candidate => {
          // Use updated_at to determine the month for application count (assuming it reflects entry)
          const updatedMonthKey = candidate.updated_at.substring(0, 7); 
          if (monthlyCounts[updatedMonthKey]) {
              monthlyCounts[updatedMonthKey].candidates++;
          }
          
          // Check if hired and updated_at falls within the last 12 months
          if (candidate.status === 'Hired' && candidate.updated_at) {
             const hiredMonthKey = candidate.updated_at.substring(0, 7);
             const hiredDate = new Date(candidate.updated_at);
             const twelveMonthsAgoDate = new Date(twelveMonthsAgo);
             
             // Ensure hire date is within the 12-month window
             if (monthlyCounts[hiredMonthKey] && hiredDate >= twelveMonthsAgoDate) {
                  monthlyCounts[hiredMonthKey].hires++;
             }
          }
      });
      
      // Extract arrays for the chart
      const candidateCounts = Object.values(monthlyCounts).map(m => m.candidates);
      const hireCounts = Object.values(monthlyCounts).map(m => m.hires);

      return { 
          candidates: candidateCounts, 
          hires: hireCounts, 
          months: monthLabels 
      };
    }
  });

  // Use calculated trends data, fallback to empty structure if loading/error
  const calculatedHiringTrends = useMemo(() => {
    if (isLoadingTrends || !trendsData) {
        // Generate 12 month labels even when loading
        const monthLabels: string[] = [];
        const currentDate = new Date();
        for (let i = 11; i >= 0; i--) {
            const date = subMonths(currentDate, i);
            monthLabels.push(date.toLocaleString('default', { month: 'short' }));
        }
        return { candidates: Array(12).fill(0), hires: Array(12).fill(0), months: monthLabels };
    }
    return trendsData;
  }, [trendsData, isLoadingTrends]);

  // --- Hiring Status Data --- 
  // Use KPI data for accurate status counts
  const calculatedStatusCounts = useMemo(() => {
     if (isLoadingKpi || !kpiData) {
         // Return zeros while loading or if data is unavailable
         return { hired: 0, rejected: 0, inProgress: 0 };
     }

     // Calculate inProgress: Total Active - Total Hired - Total Rejected
     // Assumes 'totalActiveCandidates' count includes hired/rejected unless they are also 'Closed'
     const inProgress = (kpiData.totalActiveCandidates ?? 0) 
                       - (kpiData.totalHired ?? 0) 
                       - (kpiData.totalRejected ?? 0);

     return {
         hired: kpiData.totalHired ?? 0,
         rejected: kpiData.totalRejected ?? 0,
         // Ensure inProgress doesn't go below zero due to timing or count definitions
         inProgress: Math.max(0, inProgress) 
     };

}, [kpiData, isLoadingKpi]); // Depend explicitly on KPI data and its loading state

  // --- Top Performers Data ---
  const { data: topPerformersData, isLoading: isLoadingTopPerformers } = useQuery({
    queryKey: ['analyticsTopPerformers'],
    queryFn: async () => {
      // Fetch candidates with profiles and assessment results
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          id,
          candidate_profile:profiles!candidates_id_fkey(name),
          assessment_results ( score ) 
        `)
        .not('assessment_results.score', 'is', null) // Only those with scores
        .neq('status', 'Closed'); // Exclude closed/rejected

      if (error) {
        console.error("Error fetching data for top performers:", error);
        throw new Error('Failed to fetch top performers data');
      }

      // Calculate average score for each candidate and sort
      const candidatesWithAvgScore = (data || [])
        .map((candidate: any) => {
          const scores = (candidate.assessment_results || [])
            .map((r: any) => r.score)
            .filter((s: any) => s !== null);
          
          let avgScore = 0;
          if (scores.length > 0) {
            avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
          }
          
          return {
            id: candidate.id,
            name: candidate.candidate_profile?.name ?? 'Unknown',
            score: avgScore
          };
        })
        .filter(c => c.score > 0) // Ensure they have a score
        .sort((a, b) => b.score - a.score) // Sort descending by score
        .slice(0, 5); // Take top 5

      return candidatesWithAvgScore;
    }
  });

  // --- Fetch All Questions --- 
  const { data: questionsData, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['allQuestionsForAnalytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, text'); // Select ID and text

      if (error) {
        console.error("Error fetching questions:", error);
        throw new Error('Failed to fetch questions');
      }
      return data || [];
    },
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  // --- Calculate Problem Areas --- 
  const calculatedProblemAreas = useMemo(() => {
    if (!assessmentResultsData || !questionsData) return [];

    const questionStats: { [key: string]: { correct: number; total: number } } = {};

    assessmentResultsData.forEach(result => {
      const answers = result.answers as Record<string, { is_correct?: boolean }> | null;
      if (answers) {
        Object.entries(answers).forEach(([questionId, answerData]) => {
          if (!questionStats[questionId]) {
            questionStats[questionId] = { correct: 0, total: 0 };
          }
          questionStats[questionId].total++;
          if (answerData?.is_correct === true) {
            questionStats[questionId].correct++;
          }
        });
      }
    });

    // Map questions data for quick lookup
    const questionsMap = new Map(questionsData.map(q => [q.id, q.text]));

    // Calculate success rates and filter/sort
    const problemAreas = Object.entries(questionStats)
      .map(([questionId, stats]) => ({
        id: questionId,
        text: questionsMap.get(questionId) || 'Unknown Question', // Get text from map
        successRate: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        totalAttempts: stats.total,
      }))
      .filter(q => q.totalAttempts > 0) // Only include questions that have been attempted
      .sort((a, b) => a.successRate - b.successRate) // Sort by lowest success rate
      .slice(0, 3); // Take the top 3 problems

    return problemAreas;
  }, [assessmentResultsData, questionsData]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track recruitment performance and candidate metrics
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Active Candidates
                  </p>
                  <h3 className="text-3xl font-bold mt-1">
                    {isLoadingKpi ? "..." : calculatedMetrics.totalCandidates}
                  </h3>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-4">
                <div className={`text-xs flex items-center ${calculatedMetrics.totalCandidatesChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {isLoadingKpi ? (<span>...</span>) : (
                    <>
                      {calculatedMetrics.totalCandidatesChange >= 0 ? (
                    <ArrowUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 mr-1" />
                      )}
                      <span>{Math.abs(calculatedMetrics.totalCandidatesChange)}% from last month</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Applications This Month
                  </p>
                  <h3 className="text-3xl font-bold mt-1">
                    {isLoadingKpi ? "..." : calculatedMetrics.applicationsThisMonth}
                  </h3>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className={`text-xs flex items-center ${calculatedMetrics.applicationsThisMonthChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {isLoadingKpi ? (<span>...</span>) : (
                    <>
                      {calculatedMetrics.applicationsThisMonthChange >= 0 ? (
                    <ArrowUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 mr-1" />
                      )}
                      <span>{Math.abs(calculatedMetrics.applicationsThisMonthChange)}% from last month</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Hired This Month
                  </p>
                  <h3 className="text-3xl font-bold mt-1">
                    {isLoadingKpi ? "..." : calculatedMetrics.hiredThisMonth}
                  </h3>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className={`text-xs flex items-center ${calculatedMetrics.hiredThisMonthChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {isLoadingKpi ? (<span>...</span>) : (
                    <>
                      {calculatedMetrics.hiredThisMonthChange >= 0 ? (
                    <ArrowUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 mr-1" />
                      )}
                      <span>{Math.abs(kpiData?.hiredThisMonth - kpiData?.hiredPrevMonth)} {kpiData?.hiredThisMonth >= kpiData?.hiredPrevMonth ? 'more' : 'less'} than last month</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Conversion Rate
                  </p>
                  <h3 className="text-3xl font-bold mt-1">
                    {isLoadingKpi ? "..." : `${calculatedMetrics.conversionRate}%`}
                  </h3>
                </div>
                <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className={`text-xs flex items-center ${calculatedMetrics.conversionRateChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {isLoadingKpi ? (<span>...</span>) : (
                    <>
                      {calculatedMetrics.conversionRateChange >= 0 ? (
                    <ArrowUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 mr-1" />
                      )}
                      <span>{Math.abs(calculatedMetrics.conversionRateChange)}% from last month</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-[400px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="funnel">Recruitment Funnel</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hiring Trends</CardTitle>
                  <CardDescription>
                    Candidates and hires over the past 12 months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingTrends ? (
                      <Skeleton className="h-[320px] w-full" /> // Use Skeleton for loading
                   ) : calculatedHiringTrends && calculatedHiringTrends.months ? (
                     <ResponsiveContainer width="100%" height={320}>
                       <RechartsLineChart // Use aliased name
                         data={calculatedHiringTrends.months.map((month, index) => ({
                           month,
                           Candidates: calculatedHiringTrends.candidates[index],
                           Hires: calculatedHiringTrends.hires[index],
                         }))}
                         margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                       >
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis dataKey="month" />
                         <YAxis allowDecimals={false}/>
                         <Tooltip />
                         <Legend />
                         <Line type="monotone" dataKey="Candidates" stroke="#8884d8" strokeWidth={2} />
                         <Line type="monotone" dataKey="Hires" stroke="#82ca9d" strokeWidth={2} />
                       </RechartsLineChart>
                     </ResponsiveContainer>
                   ) : (
                     <p className="text-center text-muted-foreground">No trend data available.</p>
                   )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recruitment Funnel</CardTitle>
                  <CardDescription>
                    Overall progression rates from Application
                  </CardDescription>
                </CardHeader>
                <CardContent>
                   {isLoadingFunnel ? (
                     <p>Loading funnel data...</p>
                   ) : (
                  <div className="space-y-4">
                       {calculatedFunnelData.map((item) => (
                         <div key={item.name}> {/* Use item.name as key */}
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">{item.name}</span>
                             {/* Display rate relative to initial Applied count */} 
                          <span className="text-sm font-medium">{item.value}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2"
                            style={{ width: `${item.value}%` }}
                          ></div>
                        </div>
                           <div className="text-xs text-muted-foreground text-right mt-1">
                              ({item.count} candidates reached)
                        </div>
                      </div>
                    ))}
                  </div>
                   )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                  <CardDescription>
                    Candidates with highest average assessment scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                   {isLoadingTopPerformers ? (
                      <p>Loading top performers...</p>
                   ) : (
                  <ul className="space-y-4">
                        {topPerformersData && topPerformersData.length > 0 ? (
                          topPerformersData.map((candidate) => (
                            <li key={candidate.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                            {candidate.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="ml-2 text-sm font-medium">{candidate.name}</span>
                        </div>
                        <span className="font-semibold">{candidate.score}%</span>
                      </li>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No candidates with scores found.</p>
                        )}
                  </ul>
                   )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hiring Status</CardTitle>
                  <CardDescription>
                    Current recruitment status counts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                   {isLoadingFunnel ? ( // Use funnel loading state
                     <p>Loading status counts...</p>
                   ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                           <UserCheck className="h-5 w-5 text-green-500 mr-2" /> {/* Changed icon */}
                           <span>Hired</span>
                      </div>
                         <span className="font-medium">{calculatedStatusCounts.hired}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Activity className="h-5 w-5 text-amber-500 mr-2" />
                        <span>In Progress</span>
                      </div>
                         <span className="font-medium">{calculatedStatusCounts.inProgress}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <XCircle className="h-5 w-5 text-red-500 mr-2" />
                           {/* Assuming funnel data excludes Closed, so 'rejected' is only explicit Rejected status */} 
                        <span>Rejected</span>
                      </div>
                         <span className="font-medium">{calculatedStatusCounts.rejected}</span>
                    </div>
                        {/* Add 'Closed' category if needed, requires fetching them */} 
                  </div>
                   )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="funnel" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recruitment Funnel Analysis</CardTitle>
                <CardDescription>
                  Detailed breakdown of candidate progression through each stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingFunnel ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : calculatedFunnelData && calculatedFunnelData.length > 0 ? (
                   <ResponsiveContainer width="100%" height={300}>
                     <RechartsBarChart data={calculatedFunnelData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis allowDecimals={false}/>
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Candidates" />
                     </RechartsBarChart>
                   </ResponsiveContainer>
                ) : (
                   <p className="text-center text-muted-foreground">No funnel data available.</p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stage-to-Stage Conversion Rates</CardTitle>
                  <CardDescription>
                    Percentage of candidates advancing from the previous stage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingFunnel ? (
                     <p>Loading conversion rates...</p>
                  ) : (
                  <div className="space-y-4">
                      {/* Display stageToStageRate */} 
                      {calculatedFunnelData.filter((_, index) => index > 0) // Skip first stage 'Applied'
                       .map((item, index) => {
                           const prevStageName = calculatedFunnelData[index].name; // index is shifted
                           return (
                              <div key={item.name}>
                      <div className="flex justify-between mb-2">
                                  <span>{prevStageName} → {item.name}</span>
                                  <span className="font-medium">{item.stageToStageRate}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${item.stageToStageRate}%` }}></div>
                      </div>
                    </div>
                           );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                 {/* TODO: Dynamically identify bottlenecks based on calculatedFunnelData */} 
                <CardHeader>
                  <CardTitle>Potential Bottleneck</CardTitle>
                  <CardDescription>
                    Stage with the lowest progression rate from the previous stage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   {isLoadingFunnel ? (
                     <p>Analyzing funnel...</p>
                   ) : bottleneckStage ? (
                  <div className="border rounded-md p-4 bg-red-50 border-red-200">
                         <h3 className="font-medium text-red-800 mb-1">
                           {bottleneckStage.prevStageName} → {bottleneckStage.name}
                         </h3>
                    <p className="text-sm text-red-700">
                           This stage shows the lowest conversion rate at {bottleneckStage.rate}%. 
                           Consider investigating processes or requirements at this step.
                    </p>
                  </div>
                   ) : (
                     <p className="text-sm text-muted-foreground">Could not determine bottleneck from available data.</p>
                   )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Performance</CardTitle>
                <CardDescription>Average scores across different assessments.</CardDescription>
              </CardHeader>
              <CardContent>
                 {isLoadingAssessments ? (
                   <Skeleton className="h-[300px] w-full" />
                 ) : calculatedAssessmentPerformance && calculatedAssessmentPerformance.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart data={calculatedAssessmentPerformance} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} interval={0} />
                        <YAxis domain={[0, 100]}/>
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                        <Bar dataKey="average_score" fill="hsl(var(--primary))" name="Avg Score (%)" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                 ) : (
                    <p className="text-center text-muted-foreground">No assessment performance data available.</p>
                 )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Scores</CardTitle>
                  <CardDescription>
                    Average scores for each assessment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                   {isLoadingAssessments ? (
                     <p>Loading scores...</p>
                   ) : (
                  <div className="space-y-4">
                       {calculatedAssessmentPerformance.map((assessment, index) => (
                      <div key={index}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">{assessment.name}</span>
                          <span className="text-sm font-medium">{assessment.avgScore}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              assessment.avgScore >= 80 ? "bg-green-500" : 
                              assessment.avgScore >= 70 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${assessment.avgScore}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-end">
                          <span className="text-xs text-muted-foreground">
                            {assessment.submissions} submissions
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                   )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Problem Areas</CardTitle>
                  <CardDescription>
                    Top 3 questions with the lowest success rates across all submissions
                  </CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                   {(isLoadingAssessments || isLoadingQuestions) ? (
                      // Repeat Skeleton instead of using count prop
                      <>
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </>
                   ) : calculatedProblemAreas && calculatedProblemAreas.length > 0 ? (
                      calculatedProblemAreas.map((question) => (
                         <div key={question.id} className="border rounded-md p-3">
                            <div className="flex justify-between items-center mb-1">
                               <span className="font-medium text-sm flex-1 mr-2 truncate" title={question.text}>
                                 {question.text}
                               </span>
                               <span className={`text-sm font-medium px-2 py-0.5 rounded ${question.successRate < 50 ? 'bg-red-100 text-red-700' : question.successRate < 75 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                 {question.successRate}% success
                               </span>
                      </div>
                            <p className="text-xs text-muted-foreground">
                              Based on {question.totalAttempts} attempt(s)
                      </p>
                    </div>
                      ))
                   ) : (
                     <p className="text-center text-muted-foreground">No problem areas identified or insufficient data.</p>
                   )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Analytics;
