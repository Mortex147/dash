import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, CheckCircle, AlertTriangle, Edit, Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Form schema for assessment section
const sectionSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().optional(),
});

type SectionFormValues = z.infer<typeof sectionSchema>;

const AssessmentSectionDetails = () => {
  const { sectionId: sectionIdParam } = useParams<{ sectionId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State variables
  const [section, setSection] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isNewSection, setIsNewSection] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const form = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: { title: "", description: "" },
  });

  // Effect 1: Initialize component state based on URL parameters
  useEffect(() => {
    console.log("[Effect 1] Start - Param:", sectionIdParam, "Search:", location.search);
    let initError: string | null = null;
    let newSectionFlag = false;
    let foundAssessmentId: string | null = null;
    let effectiveSectionId: string | null = null;

    // Reset states for re-initialization
      setLoading(true);
      setLoadingError(null);
    setIsInitialized(false);
    setSection(null);
    setQuestions([]);
    form.reset();

    const params = new URLSearchParams(location.search);
    const assessmentIdParam = params.get('assessmentId');
    console.log("[Effect 1] assessmentIdParam from URL:", assessmentIdParam);

    // Check if we're creating a new section
    if (!sectionIdParam) {
      console.log("[Effect 1] Mode: New Section");
      newSectionFlag = true;
      effectiveSectionId = null;
      
      if (!assessmentIdParam) {
        console.error("[Effect 1] Error: Assessment ID missing for new section.");
        initError = "Cannot create a new section: Assessment ID is missing from URL.";
      } else {
        foundAssessmentId = assessmentIdParam;
      }
    } 
    // Check if we're editing an existing section
    else {
      console.log("[Effect 1] Mode: Edit Section - ID Param:", sectionIdParam);
      newSectionFlag = false;
      effectiveSectionId = sectionIdParam;
      
      if (assessmentIdParam) {
        foundAssessmentId = assessmentIdParam;
      }
    }

    // Update state based on initialization checks
    setIsNewSection(newSectionFlag);
    setAssessmentId(foundAssessmentId);
    setCurrentSectionId(effectiveSectionId);
    setLoadingError(initError);
    setIsInitialized(true);

    if (newSectionFlag && foundAssessmentId) {
      setLoading(false); // No need to load data for new section
    }

    console.log("[Effect 1] End - isInitialized:", true, "isNewSection:", newSectionFlag, "assessmentId:", foundAssessmentId, "currentSectionId:", effectiveSectionId, "loadingError:", initError);

  }, [sectionIdParam, location.search]);

  // Effect 2: Load data if necessary (Edit Mode), after initialization is complete
  useEffect(() => {
    console.log("[Effect 2] Start - Dependencies:", { isInitialized, isNewSection, currentSectionId, loadingError });

    // Only proceed if initialization is done and successful, and we are in edit mode
    if (!isInitialized) {
      console.log("[Effect 2] Skip: Not initialized yet.");
      return;
    }
    if (loadingError) {
      console.log("[Effect 2] Skip: Initialization error detected:", loadingError);
      setLoading(false); // Stop loading as init failed
      return;
    }
    if (isNewSection) {
      console.log("[Effect 2] Skip: New section mode. No data to load.");
      setLoading(false); // Stop loading as it's a new section
      return;
    }
    if (!currentSectionId) {
      console.error("[Effect 2] Skip: In Edit mode but currentSectionId is missing!");
      setLoadingError("Internal error: Section ID is missing for editing.");
      setLoading(false);
          return;
        }
        
    // --- Load existing section logic --- 
    console.log("[Effect 2] Action: Loading existing section data for ID:", currentSectionId);
    const loadExistingSection = async () => {
      // setLoading(true); // Already true from Effect 1
      let fetchError: string | null = null;

      try {
        console.log("[Effect 2 Load] Fetching section details...");
        const { data: sectionData, error: sectionError } = await supabase
          .from("assessment_sections")
          .select("*, assessment_id") // Ensure assessment_id is selected
          .eq("id", currentSectionId!)
          .single();
        
        if (sectionError) {
          console.error("[Effect 2 Load] Supabase error fetching section:", sectionError);
          fetchError = `Database error: ${sectionError.message}`; 
          throw sectionError;
        }
        if (!sectionData) {
          console.log("[Effect 2 Load] Section not found in DB for ID:", currentSectionId);
          fetchError = "Section not found.";
          throw new Error(fetchError);
        }
        
        console.log("[Effect 2 Load] Section data fetched:", sectionData);
        setSection(sectionData);
        // Set/Confirm assessmentId from fetched data for reliable back navigation
        if (sectionData.assessment_id) {
        setAssessmentId(sectionData.assessment_id);
            console.log("[Effect 2 Load] Confirmed assessmentId from fetched data:", sectionData.assessment_id);
        } else {
            console.warn("[Effect 2 Load] Assessment ID missing from fetched section data!");
            // Keep assessmentId from URL param if available, otherwise it might remain null
        }

        form.reset({ title: sectionData.title || "", description: sectionData.description || "" });
        console.log("[Effect 2 Load] Form reset.");
        
        // Fetch questions
        console.log("[Effect 2 Load] Fetching questions...");
        const { data: questionData, error: questionError } = await supabase
          .from("questions")
          .select("*")
          .eq("section_id", currentSectionId!)
          .order("created_at", { ascending: true });
        
        if (questionError) {
          console.error("[Effect 2 Load] Supabase error fetching questions:", questionError);
          // Decide if failing to load questions is a critical error
          toast.warning(`Failed to load questions: ${questionError.message}`);
        }
        console.log("[Effect 2 Load] Questions fetched:", questionData);
        setQuestions(questionData || []);

      } catch (error: any) {
        console.error("[Effect 2 Load] Error during load process:", error.message);
        setLoadingError(fetchError || `Failed to load section: ${error.message}`); // Use specific fetchError if available
        toast.error(loadingError || "Failed to load section data.");
      } finally {
        console.log("[Effect 2 Load] Finished loading attempt. Setting loading to false.");
        setLoading(false); // Loading finished (success or error)
      }
    };
    
    loadExistingSection();

  }, [isInitialized, isNewSection, currentSectionId, loadingError]); // Dependencies for data loading trigger

  const onSubmit = async (values: SectionFormValues) => {
    if (!user) {
      toast.error("You must be logged in to save a section");
      return;
    }
    
    if (isNewSection) {
      // Create: Ensure assessmentId is present
      if (!assessmentId) {
        toast.error("Cannot create section: Assessment ID is missing.");
        console.error("onSubmit: Create failed - missing assessmentId.");
        return; 
      }
      console.log("onSubmit: Creating new section for assessment ID:", assessmentId);
    setSaving(true);
      try {
        const { data: newSection, error } = await supabase
          .from("assessment_sections")
          .insert({
            title: values.title,
            description: values.description,
            assessment_id: assessmentId, // Checked above
          })
          .select()
          .single();
        
        if (error) throw error;
        
        toast.success("Section created successfully");
        console.log("onSubmit: Create success, navigating to:", `/assessments/${assessmentId}`);
        navigate(`/assessments/${assessmentId}`); // Navigate back to parent assessment
      } catch (error: any) {
        console.error("onSubmit: Create error:", error.message);
        toast.error(`Failed to create section: ${error.message}`);
      } finally {
        setSaving(false);
      }
    } else {
      // Update: Ensure currentSectionId is present
      if (!currentSectionId) {
        toast.error("Cannot update section: Section ID is missing.");
        console.error("onSubmit: Update failed - missing currentSectionId.");
        return;
      }
      console.log("onSubmit: Updating existing section ID:", currentSectionId);
      setSaving(true);
      try {
      const updateData = {
        title: values.title,
        description: values.description,
      };
      const { error } = await supabase
        .from("assessment_sections")
        .update(updateData)
          .eq("id", currentSectionId); // Checked above
      
      if (error) throw error;
      
      toast.success("Section updated successfully");
        console.log("onSubmit: Update success for section:", currentSectionId);
        // Optionally re-fetch data if needed after update, or rely on user navigation
    } catch (error: any) {
        console.error("onSubmit: Update error:", error.message);
      toast.error(`Failed to update section: ${error.message}`);
    } finally {
      setSaving(false);
      }
    }
  };

  const handleDeleteSection = async () => {
    if (!user) {
      toast.error("You must be logged in to delete a section");
      return;
    }
    
    // Ensure we are in edit mode and have IDs
    if (isNewSection || !currentSectionId || !assessmentId) {
        toast.error("Cannot delete section: Invalid state or missing IDs.");
        console.error("handleDelete: Invalid state:", {isNewSection, currentSectionId, assessmentId});
        setShowDeleteDialog(false);
      return;
    }
    
    setIsDeleting(true);
    
    try {
      console.log("handleDelete: Deleting questions for section ID:", currentSectionId);
      // Delete questions first (handle potential errors)
      const { error: questionDeleteError } = await supabase
        .from("questions")
        .delete()
        .eq("section_id", currentSectionId);
      
      if (questionDeleteError) {
          console.error("handleDelete: Error deleting questions:", questionDeleteError.message);
          // Decide if this is fatal or just warn the user
          toast.warning(`Could not delete questions: ${questionDeleteError.message}`);
      }
      
      console.log("handleDelete: Deleting section ID:", currentSectionId);
      // Then delete the section
      const { error: sectionDeleteError } = await supabase
        .from("assessment_sections")
        .delete()
        .eq("id", currentSectionId);
      
      if (sectionDeleteError) throw sectionDeleteError; // This is likely fatal
      
      toast.success("Section deleted successfully");
      
      // Redirect to assessment details
      console.log("handleDelete: Success, navigating to assessment:", assessmentId);
      navigate(`/assessments/${assessmentId}`);
    } catch (error: any) {
      console.error("handleDelete: Error deleting section:", error.message);
      toast.error(`Failed to delete section: ${error.message}`);
      // Keep dialog open on critical failure? Or close?
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false); // Close dialog regardless of outcome?
    }
  };

  // Render Loading State
  if (!isInitialized || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">
              {!isInitialized ? "Initializing..." : "Loading section details..."}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Render Error State
  if (loadingError) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center space-y-4 max-w-md text-center">
            <div className="p-3 rounded-full bg-red-50">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold">Error</h2>
            <p className="text-muted-foreground">
              {loadingError} {/* Display the specific error */}
            </p>
            <Button asChild>
              {/* Link back to general assessments page as context might be lost */}
              <Link to="/assessments">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Assessments List
              </Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Render Main Content (Initialized, Not Loading, No Errors)
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isNewSection ? "Create New Section" : "Section Details"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isNewSection ? "Add a new section to the assessment" : `Editing section for Assessment ID: ${assessmentId || '...'}`}
            </p>
          </div>
          <div className="flex space-x-2">
            {!isNewSection && currentSectionId && (
            <Button 
              variant="destructive"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                title="Delete Section"
            >
              <Trash className="h-4 w-4" />
            </Button>
            )}
            {assessmentId && (
            <Button asChild variant="outline">
              <Link to={`/assessments/${assessmentId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Assessment
              </Link>
            </Button>
            )}
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>{isNewSection ? "New Section Details" : "Section Information"}</CardTitle>
            <CardDescription>
              {isNewSection ? "Enter the details for the new section." : `Update details for section ID: ${currentSectionId}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Section title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the section purpose and content (optional)" 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" disabled={saving || isDeleting}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" /> 
                      {isNewSection ? "Create Section" : "Save Changes"}
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Questions Card (only for existing sections) */}
        {!isNewSection && currentSectionId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Questions</CardTitle>
              <CardDescription>
                  Manage the questions in this section ({questions.length} questions)
              </CardDescription>
            </div>
            <Button asChild size="sm">
                <Link to={`/questions/create?sectionId=${currentSectionId}`}>
                <Plus className="h-4 w-4 mr-1" /> Add Question
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center py-8 border rounded-md">
                <div className="flex justify-center">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No questions yet</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                    This section doesn't have any questions. Add the first question to get started.
                </p>
                <Button asChild className="mt-4" variant="outline">
                    <Link to={`/questions/create?sectionId=${currentSectionId}`}>
                      <Plus className="h-4 w-4 mr-1" /> Add First Question
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                    <div key={question.id} className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50">
                    <div>
                      <p className="font-medium">Question {index + 1}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2" title={question.text}>{question.text}</p>
                    </div>
                    <div className="flex space-x-2">
                      {/* Link to edit - pass sectionId via state prop */}
                      <Button asChild variant="ghost" size="icon">
                        <Link 
                          to={`/questions/${question.id}`} 
                          state={{ sectionId: currentSectionId }} // Pass via state
                          title="Edit Question"
                        >
                          <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                      {/* Add Delete button here if needed */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Delete Confirmation Dialog (only for existing sections) */}
        {!isNewSection && currentSectionId && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Section</DialogTitle>
              <DialogDescription>
                  Are you sure you want to delete section "{section?.title || currentSectionId}"? This action cannot be undone and will permanently delete all associated questions ({questions.length}).
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-destructive/10 rounded-md border border-destructive/20 text-destructive">
              <p className="text-sm">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Warning: This is irreversible.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteSection} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                      <Trash className="h-4 w-4 mr-1" /> Yes, Delete Section
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>
    </MainLayout>
  );
};

export default AssessmentSectionDetails;
