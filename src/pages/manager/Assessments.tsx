import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  MoreHorizontal,
  FileText,
  Edit,
  Copy,
  Trash2,
  Eye,
  BarChart
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

// Define the type for an assessment row from Supabase
type Assessment = Database['public']['Tables']['assessments']['Row'];

const Assessments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [newAssessmentTitle, setNewAssessmentTitle] = useState("");
  const [newAssessmentDescription, setNewAssessmentDescription] = useState("");
  const [newAssessmentDifficulty, setNewAssessmentDifficulty] = useState("Intermediate");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch assessments data using useQuery
  const { 
    data: fetchedAssessments, 
    isLoading: isLoadingAssessments,
    error: assessmentsError 
  } = useQuery<Assessment[]>({
    queryKey: ['assessments'],
    queryFn: async (): Promise<Assessment[]> => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error("Failed to fetch assessments: " + error.message);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user,
  });

  const filteredAssessments = fetchedAssessments?.filter(assessment => 
    assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (assessment.description && assessment.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  // Mutation for creating an assessment
  const createAssessmentMutation = useMutation({
    mutationFn: async (newAssessmentData: Omit<Assessment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('assessments')
        .insert([newAssessmentData])
        .select(); // Select the newly created row

      if (error) {
        throw new Error(error.message);
      }
      return data?.[0]; // Return the created assessment
    },
    onSuccess: () => {
      // Invalidate and refetch the assessments query to show the new assessment
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast.success("Assessment created successfully");
      setIsDialogOpen(false); // Close the dialog
      // Reset form state
      setNewAssessmentTitle("");
      setNewAssessmentDescription("");
      setNewAssessmentDifficulty("Intermediate"); // Reset difficulty state to a valid value
    },
    onError: (error) => {
      toast.error("Failed to create assessment: " + error.message);
    },
  });

  const handleCreateAssessment = () => {
    if (!newAssessmentTitle) {
      toast.error("Assessment title is required");
      return;
    }
    if (!user) {
      toast.error("You must be logged in to create an assessment.");
      return;
    }

    // Prepare data for insertion using the correct state variable
    const assessmentDataToInsert = {
      title: newAssessmentTitle,
      description: newAssessmentDescription || null,
      difficulty: newAssessmentDifficulty, // Use difficulty state
      created_by: user.id, 
      prevent_backtracking: false, 
      randomize_questions: false,
      time_limit: null,
    };

    createAssessmentMutation.mutate(assessmentDataToInsert);
  };

  const deleteAssessment = (id: string) => {
    // TODO: Implement delete mutation
    toast.info("Delete functionality not yet implemented with database.");
  };

  const duplicateAssessment = (id: string) => {
    // TODO: Implement duplicate mutation
    toast.info("Duplicate functionality not yet implemented with database.");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage assessments for candidate evaluation
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Assessment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Assessment</DialogTitle>
                <DialogDescription>
                  Create a new assessment for candidates to complete.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Assessment Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter assessment title"
                    value={newAssessmentTitle}
                    onChange={(e) => setNewAssessmentTitle(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter assessment description"
                    value={newAssessmentDescription}
                    onChange={(e) => setNewAssessmentDescription(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select
                    value={newAssessmentDifficulty}
                    onValueChange={setNewAssessmentDifficulty}
                  >
                    <SelectTrigger id="difficulty">
                      <SelectValue placeholder="Select difficulty level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Basic">Basic</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleCreateAssessment}>
                  Create Assessment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search assessments..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Assessments</CardTitle>
            <CardDescription>
              {isLoadingAssessments ? "Loading..." : `${filteredAssessments.length} assessments found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAssessments ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      Loading assessments...
                    </TableCell>
                  </TableRow>
                ) : assessmentsError ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-red-600">
                      Error loading assessments: {assessmentsError.message}
                    </TableCell>
                  </TableRow>
                ) : filteredAssessments.length > 0 ? (
                  filteredAssessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assessment.title}</div>
                          <div className="text-sm text-muted-foreground hidden md:block">
                            {assessment.description || "No description"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{assessment.difficulty || "Standard"}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {new Date(assessment.updated_at).toLocaleDateString()}
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
                              <Link to={`/assessments/${assessment.id}`}>
                                <Eye className="h-4 w-4 mr-2" /> View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/assessments/${assessment.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/assessments/${assessment.id}/results`}>
                                <BarChart className="h-4 w-4 mr-2" /> Results
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateAssessment(assessment.id)}>
                              <Copy className="h-4 w-4 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => deleteAssessment(assessment.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                        <h3 className="font-medium text-lg">No assessments found</h3>
                        <p className="text-muted-foreground mb-4">
                          {searchTerm ? "Try adjusting your search term" : "Create your first assessment to get started"}
                        </p>
                        <Button onClick={() => setIsDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Assessment
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Assessments;
