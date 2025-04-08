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
  BarChart,
  LineChart,
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
        .eq('status', 'Hired') // Assuming status is 'Hired'
        .gte('updated_at', startOfCurrentMonth) // Assuming updated_at tracks hire date
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
          .eq('status', 'Hired')
          .gte('updated_at', startOfPreviousMonth)
          .lte('updated_at', endOfPreviousMonth);

      // Handle potential errors for all fetches
      const allErrors = { errorActive, errorApps, errorHired, errorActivePrev, errorAppsPrev, errorHiredPrev };
      if (Object.values(allErrors).some(e => e !== null)) {
          console.error("Error fetching KPI data (current or prev):", allErrors);
          throw new Error('Failed to fetch KPI data');
      }

      return {
          totalActiveCandidates: totalActiveCandidates ?? 0,
          applicationsThisMonth: applicationsThisMonth ?? 0,
          hiredThisMonth: hiredThisMonth ?? 0,
          totalActiveCandidatesPrev: totalActiveCandidatesPrev ?? 0,
          applicationsPrevMonth: applicationsPrevMonth ?? 0,
          hiredPrevMonth: hiredPrevMonth ?? 0,
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
  // Define funnel stages and corresponding statuses
  const funnelStages = [
    { name: 'Applied', statuses: ['applied', 'hr_review', 'hr_approved', 'training', 'sales_task', 'final_interview', 'Hired'] },
    { name: 'Screening Passed', statuses: ['hr_approved', 'training', 'sales_task', 'final_interview', 'Hired'] }, // Assuming hr_approved means passed screening
    { name: 'Training Completed', statuses: ['sales_task', 'final_interview', 'Hired'] },
    { name: 'Sales Task Passed', statuses: ['final_interview', 'Hired'] },
    { name: 'Interview Passed (Hired)', statuses: ['Hired'] },
  ];

  // Fetch all non-closed candidates for funnel calculation
  const { data: funnelCandidatesData, isLoading: isLoadingFunnel } = useQuery({
    queryKey: ['analyticsFunnelCandidates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, status')
        .neq('status', 'Closed'); // Exclude closed/rejected early

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
    if (!assessmentResultsData || assessmentResultsData.length === 0) {
      return assessmentStages.map(name => ({ name, avgScore: 0, submissions: 0 }));
    }

    const performance = assessmentStages.map(stageName => {
      // Find results matching the stage name (assuming assessment title matches stage name)
      const stageResults = assessmentResultsData.filter((result: any) => 
          result.assessments?.title === stageName && result.score !== null
      );

      const submissions = stageResults.length;
      let avgScore = 0;

      if (submissions > 0) {
        const totalScore = stageResults.reduce((sum, result) => sum + (result.score ?? 0), 0);
        avgScore = Math.round(totalScore / submissions);
      }

      return { name: stageName, avgScore, submissions };
    });

    return performance;

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
  // Re-use funnel data for status counts to minimize fetches
  const calculatedStatusCounts = useMemo(() => {
    const sourceData = funnelCandidatesData || []; // Use funnel data directly
     if (sourceData.length === 0) {
         return { hired: 0, rejected: 0, inProgress: 0 }; // Added rejected
     }

     let hired = 0;
     let rejected = 0; // Assuming 'Closed' status implies rejected for this view
     let inProgress = 0;

     sourceData.forEach((candidate: any) => {
         if (candidate.status === 'Hired') {
             hired++;
         } else if (candidate.status === 'Rejected') { // Check for explicit Rejected status
             rejected++;
         } else { // Count others as in progress (implicitly excludes Closed fetched by funnel query)
            inProgress++;
         }
     });

     // If you also want to count explicitly Closed/Rejected fetched separately:
     // You'd need another query or modify the funnel query

     return { hired, rejected, inProgress };

}, [funnelCandidatesData]); // Depend on funnel data

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
                  <div className="h-80 flex items-center justify-center">
                     {isLoadingTrends ? (
                        <p>Loading trends...</p>
                     ) : (
                       <div className="text-center p-8 space-y-2">
                         <LineChart className="h-12 w-12 text-muted-foreground mx-auto" />
                         <h3 className="font-medium">Line chart showing hiring trends</h3>
                         <p className="text-sm text-muted-foreground">
                           Candidates vs. Hires (Data Loaded)
                         </p>
                       </div>
                     )}
                  </div>
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
                {/* TODO: Implement a proper funnel chart visualization */} 
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center p-8 space-y-2">
                    <BarChart className="h-12 w-12 text-muted-foreground mx-auto" />
                    <h3 className="font-medium">Detailed funnel visualization Placeholder</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete recruitment funnel with dropoff rates (Data Loaded)
                    </p>
                     {isLoadingFunnel && <p>Loading...</p>}
                  </div>
                </div>
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
                    {/* Keep other mock/placeholder insights if desired */} 
                     <div className="border rounded-md p-4 bg-green-50 border-green-200">
                       <h3 className="font-medium text-green-800 mb-1">Screening Efficiency (Mock Text)</h3>
                       <p className="text-sm text-green-700">
                         Initial screening is highly efficient with 75% of candidates moving forward. 
                         The current screening criteria are well-calibrated.
                       </p>
                     </div>
                 </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Performance</CardTitle>
                <CardDescription>
                  Average scores and submission rates by assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                 {/* TODO: Replace with actual chart using calculatedAssessmentPerformance */} 
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center p-8 space-y-2">
                    <BarChart className="h-12 w-12 text-muted-foreground mx-auto" />
                    <h3 className="font-medium">Bar chart of assessment performance</h3>
                     {isLoadingAssessments && <p>Loading...</p>} 
                    <p className="text-sm text-muted-foreground">
                      Comparing scores across different assessments (Data Loaded)
                    </p>
                  </div>
                </div>
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
                  <CardTitle>Problem Areas (Mock)</CardTitle>
                  <CardDescription>
                    Questions with lowest success rates (Requires JSON analysis)
                  </CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                   <div className="border rounded-md p-3">
                     <div className="flex justify-between mb-1">
                       <span className="font-medium">Objection Handling - Question 8</span>
                       <span className="text-red-600 font-medium">32% success</span>
                     </div>
                     <p className="text-sm text-muted-foreground">
                       "How would you handle a customer who claims our product is too expensive?"
                     </p>
                   </div>
                   
                   <div className="border rounded-md p-3">
                     <div className="flex justify-between mb-1">
                       <span className="font-medium">Sales Techniques - Question 12</span>
                       <span className="text-red-600 font-medium">35% success</span>
                     </div>
                     <p className="text-sm text-muted-foreground">
                       "Describe the SPIN selling method and when to use it."
                     </p>
                   </div>
                   
                   <div className="border rounded-md p-3">
                     <div className="flex justify-between mb-1">
                       <span className="font-medium">Product Knowledge - Question 7</span>
                       <span className="text-red-600 font-medium">41% success</span>
                     </div>
                     <p className="text-sm text-muted-foreground">
                       "Compare the advantages of our premium vs standard product lines."
                     </p>
                   </div>
                   
                   <div className="border rounded-md p-3">
                     <div className="flex justify-between mb-1">
                       <span className="font-medium">Final Assessment - Question 23</span>
                       <span className="text-red-600 font-medium">44% success</span>
                     </div>
                     <p className="text-sm text-muted-foreground">
                       "Create a personalized sales strategy for the described customer scenario."
                     </p>
                   </div>
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
