import React, { useState , useEffect} from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  Clock,
  MoreHorizontal,
  Search,
  Filter,
  XCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Info,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";
import { set } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const Candidates = () => {
  const { user, profile } = useAuth();
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filteredCandidates, setFilteredCandidates] = useState<any[]>([]);
  
  // Fetch candidate data
  const { data: candidatesData = [], isLoading: isLoadingCandidates } = useQuery({
    // Include user ID and profile role in queryKey 
    queryKey: ['candidatesPage', user?.id, profile?.role],
    queryFn: async () => {
      // Check for profile as well, since role check depends on it
      if (!user || !profile) return []; 
      
      try {
        // Start building the query
        let query = supabase
          .from('candidates')
          .select(`
            id,
            status,
            current_step,
            updated_at,
            candidate_profile:profiles!candidates_id_fkey(*),
            assessment_results(score, completed, completed_at)
          `)
          // Ensure we only get actual candidates by checking profile role
          .eq('candidate_profile.role', 'candidate');

        // Apply filter ONLY if the profile role is manager
        if (profile.role === 'manager') {
          console.log(`[Candidates.tsx] Applying manager filter for user: ${user.id}`);
          query = query.eq('assigned_manager', user.id);
        } else {
          console.log(`[Candidates.tsx] Role is ${profile.role}, not applying manager filter.`);
        }
        
        // Always order
        query = query.order('updated_at', { ascending: false });

        // Execute the final query
        const { data, error } = await query;

        console.log(`Candidates.tsx (${profile.role}) Supabase Response:`, { data, error });

        if (error) {
          toast.error(`Error fetching candidates: ${error.message}`);
          throw error;
        }

        return data || [];
      } catch (err) {
        console.error("Error in candidatesData query:", err);
        return [];
      }
    },
    enabled: !!user && !!profile // Only run query if user and profile exist
  });

  // Use candidatesData as the source for filtering
  useEffect(() => {
    // Filter candidates whenever the searchTerm, filterStatus, or candidatesData changes
    const filtered = candidatesData.filter(candidate => {
      // Explicitly check if the profile exists and role is 'candidate'
      if (candidate.candidate_profile?.role !== 'candidate') {
        return false; 
      }
      
      const candidateName = candidate.candidate_profile?.name || "";
      const candidateEmail = candidate.candidate_profile?.email || "";
      const matchesSearch = candidateName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            candidateEmail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = filterStatus ? candidate.status === filterStatus : true;
      return matchesSearch && matchesFilter;
    });
    
    setFilteredCandidates(filtered);
  }, [candidatesData, searchTerm, filterStatus]);

  const toggleExpand = (id: string) => {
    setExpandedCandidate(prev => (prev === id ? null : id));
  };

  const deleteCandidate = async (id: string) => {
    try {
       const { error, count } = await supabase
        .from('candidates')
        .delete()
        .eq('id', id)
        .select();
  
      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }
  
      if (count === 0) {
        toast.error("Candidate not found or already deleted");
        return;
      }
   
      // Remove the deleted candidate from the filteredCandidates state
      setFilteredCandidates(prevState => prevState.filter(candidate => candidate.id !== id));
  
      toast.success("Candidate deleted successfully");
  
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Deletion failed";
      toast.error(`Error deleting candidate: ${message}`);
    }
  };
  
  const scheduleInterview = (id: string) => {
    toast.success("Interview scheduled successfully");
    // Implement interview scheduling logic here
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "applied":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            Applied
          </Badge>
        );
      case "screening":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" /> Screening
          </Badge>
        );
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
      case "hr_review":
        return (
          <Badge className="bg-cyan-100 text-cyan-800">
            <Info className="mr-1 h-3 w-3" /> HR Review
          </Badge>
        );
      case "hr_approved":
        return (
          <Badge className="bg-teal-100 text-teal-800">
            <CheckCircle className="mr-1 h-3 w-3" /> HR Approved
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCandidateScore = (candidate: any) => {
    if (!candidate.assessment_results || candidate.assessment_results.length === 0) {
      return "N/A";
    }
    
    const scores = candidate.assessment_results
      .filter((result: any) => result.score !== null)
      .map((result: any) => result.score);
    
    if (scores.length === 0) return "N/A";
    
    const avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
    // Return just the number, % sign is added in JSX
    return avgScore; 
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
            <p className="text-muted-foreground mt-2">
              Manage and review candidate applications
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search candidates..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {filterStatus ? `Filter: ${filterStatus}` : 'Filter'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilterStatus(null)}>
                  All Status
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterStatus("applied")}>
                  Applied
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("screening")}>
                  Screening
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("training")}>
                  Training
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("sales_task")}>
                  Sales Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("interview")}>
                  Interview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("hired")}>
                  Hired
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("rejected")}>
                  Rejected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>All Candidates</CardTitle>
            <CardDescription>
              Total: {filteredCandidates.length} candidates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Applied</TableHead>
                    <TableHead className="hidden md:table-cell">Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingCandidates ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        Loading candidates...
                      </TableCell>
                    </TableRow>
                  ) : filteredCandidates.length > 0 ? (
                    filteredCandidates.map((candidate) => (
                      <React.Fragment key={candidate.id}>
                        <TableRow>
                          <TableCell>
                            <div className="flex items-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 mr-2 text-muted-foreground"
                                onClick={() => toggleExpand(candidate.id)}
                              >
                                {expandedCandidate === candidate.id ? 
                                  <ChevronUp className="h-4 w-4" /> : 
                                  <ChevronDown className="h-4 w-4" />}
                              </Button>
                              <div>
                                <div className="font-medium">
                                  {candidate.candidate_profile?.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {candidate.candidate_profile?.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {console.log('Rendering Candidate Status:', candidate.id, '| Status:', candidate.status)}
                            {getStatusBadge(candidate.status)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {new Date(candidate.updated_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {getCandidateScore(candidate) !== "N/A" ? `${getCandidateScore(candidate)}%` : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/candidates/${candidate.id}`}>
                                    <Eye className="h-4 w-4 mr-2" /> View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => deleteCandidate(candidate.id)} className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {expandedCandidate === candidate.id && (
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={5} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Contact Information</h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Email:</span>
                                      <span>{candidate.candidate_profile?.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Phone:</span>
                                      <span>{candidate.phone}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Location:</span>
                                      <span>{candidate.location}</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Application Details</h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Step:</span>
                                      <span>Step {candidate.current_step} of 4</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Test Score:</span>
                                      <span>{getCandidateScore(candidate) !== "N/A" ? `${getCandidateScore(candidate)}%` : "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Videos:</span>
                                      <span>{candidate.videos} submitted</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Actions</h4>
                                  <div className="space-y-2">
                                    <Button size="sm" variant="default" className="w-full justify-start" asChild>
                                      <Link to={`/candidates/${candidate.id}`}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Full Profile
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No candidates found matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Candidates;
