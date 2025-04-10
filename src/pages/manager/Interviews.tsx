import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import MainLayout from "@/components/layout/MainLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";

// Basic Interview Type (expand as needed)
interface InterviewData {
  id: string;
  scheduled_at: string;
  status: string;
  candidate_profile: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  manager_profile: {
    id: string;
    name: string | null;
  } | null;
  // Add other relevant fields like feedback, decision, notes etc.
}

const Interviews = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filteredInterviews, setFilteredInterviews] = useState<InterviewData[]>([]);
  // Add state for search/filtering if needed later

  const { data: interviewsData = [], isLoading: isLoadingInterviews } = useQuery<
    InterviewData[]
  >({
    queryKey: ['interviewsPage', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return [];

      try {
        let query = supabase
          .from('interviews')
          .select(`
            id,
            scheduled_at,
            status,
            candidate:candidates!interviews_candidate_id_fkey (
              id, profile:profiles!candidates_id_fkey ( id, name, email )
            ),
            manager:managers!interviews_manager_id_fkey (
              id, profile:profiles!managers_id_fkey ( id, name )
            )
          `)
          .order('scheduled_at', { ascending: false }); // Show most recent first

        // Apply filter ONLY if the user is a manager
        if (user.role === 'manager') {
          query = query.eq('manager_id', user.id);
        }

        const { data, error } = await query;

        console.log(`Interviews.tsx (${user.role}) Supabase Response:`, { data, error });

        if (error) {
          toast.error(`Error fetching interviews: ${error.message}`);
          throw error;
        }

        // Adjust data structure to match the new select structure
        const formattedData = data?.map(item => ({
          id: item.id,
          scheduled_at: item.scheduled_at,
          status: item.status,
          // Access profile through the new structure
          candidate_profile: item.candidate?.profile ?? null,
          manager_profile: item.manager?.profile ?? null,
        })) || [];
        
        return formattedData as InterviewData[]; // Cast after formatting

      } catch (err) {
        console.error("Error in interviewsData query:", err);
        return [];
      }
    },
    enabled: !!user,
  });

  // Basic effect to set filtered data (can add search/filter logic here later)
  useEffect(() => {
    setFilteredInterviews(interviewsData);
  }, [interviewsData]);

  // Placeholder for status badge logic (copy/adapt from InterviewList if needed)
  const getInterviewStatusBadge = (status: string) => {
     // Basic status mapping - expand as needed
     let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
     if (status === 'completed') variant = 'default';
     if (status === 'cancelled' || status === 'rejected') variant = 'destructive'; // Assuming rejected status might exist
     if (status === 'scheduled' || status === 'confirmed') variant = 'outline';

     return <Badge variant={variant}>{status}</Badge>;
  };

  // Format datetime for display
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "Invalid Date";
    }
  };

  // --- Mutation to update interview status ---
  const updateInterviewStatus = useMutation({
    mutationFn: async ({ interviewId, status }: { interviewId: string; status: string }) => {
      const { error } = await supabase
        .from('interviews')
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq('id', interviewId);

      if (error) {
        throw new Error(`Failed to update interview status: ${error.message}`);
      }
      return { interviewId, status }; // Return updated info
    },
    onSuccess: (data) => {
      toast.success(`Interview marked as ${data.status}.`);
      // Invalidate the query cache to refetch and update the table
      queryClient.invalidateQueries({ queryKey: ['interviewsPage', user?.id, user?.role] });
    },
    onError: (error) => {
      toast.error(error.message);
      console.error("Error updating interview:", error);
    },
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Interview Management</h1>

        <Card>
          <CardHeader>
            <CardTitle>All Interviews</CardTitle>
            <CardDescription>
              View and manage scheduled and completed interviews. {user?.role === 'manager' ? '(Showing your assigned interviews)' : '(Showing all interviews)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
             {isLoadingInterviews ? (
               <p>Loading interviews...</p>
             ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Status</TableHead>
                  {user?.role !== 'manager' && <TableHead>Manager</TableHead>} {/* Show manager for non-managers */}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInterviews.length > 0 ? (
                  filteredInterviews.map((interview) => (
                    <TableRow key={interview.id}>
                      <TableCell>
                         {interview.candidate_profile?.name || interview.candidate_profile?.email || 'N/A'}
                      </TableCell>
                      <TableCell>
                         {formatDateTime(interview.scheduled_at)}
                      </TableCell>
                      <TableCell>
                        {getInterviewStatusBadge(interview.status)}
                      </TableCell>
                       {user?.role !== 'manager' && (
                         <TableCell>{interview.manager_profile?.name || 'N/A'}</TableCell>
                       )}
                      <TableCell>
                        <div className="flex space-x-2">
                          {/* Show complete/cancel only if scheduled/confirmed */} 
                          {(interview.status === 'scheduled' || interview.status === 'confirmed') && (
                            <>
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => updateInterviewStatus.mutate({ interviewId: interview.id, status: 'completed' })}
                                disabled={updateInterviewStatus.isPending}
                              >
                                Mark Completed
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => updateInterviewStatus.mutate({ interviewId: interview.id, status: 'cancelled' })}
                                disabled={updateInterviewStatus.isPending}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {/* Optional: Add a View button again if needed later, linking to a detail page */}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={user?.role === 'manager' ? 4 : 5} className="text-center">
                      No interviews found.
                    </TableCell>
                  </TableRow>
                )}            </TableBody>
            </Table>
             )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Interviews;
