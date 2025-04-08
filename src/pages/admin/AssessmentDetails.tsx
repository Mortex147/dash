import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import Loading from "@/components/ui/loading";
import ErrorMessage from "@/components/ui/error-message";
import AssessmentForm, { AssessmentFormValues } from "@/components/assessments/AssessmentForm";
import SectionsList from "@/components/assessments/SectionsList";
import AssessmentResultsSummary from "@/components/assessments/AssessmentResultsSummary";
import AssessmentStats from "@/components/assessments/AssessmentStats";

const AssessmentDetails = () => {
  const { assessmentId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [assessment, setAssessment] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AssessmentFormValues | null>(null);

  // Load assessment data
  useEffect(() => {
    const loadAssessment = async () => {
      setLoading(true);
      setLoadingError(null);
      
      try {
        if (!assessmentId) {
          setLoadingError("Assessment ID is missing");
          return;
        }
        
        // Fetch assessment
        const { data: assessmentData, error: assessmentError } = await supabase
          .from("assessments")
          .select("*")
          .eq("id", assessmentId)
          .single();
        
        if (assessmentError) {
          throw assessmentError;
        }
        
        if (!assessmentData) {
          setLoadingError("Assessment not found");
          return;
        }
        
        setAssessment(assessmentData);
        
        // Set form values
        setFormData({
          title: assessmentData.title || "",
          description: assessmentData.description || "",
          difficulty: assessmentData.difficulty || "",
          prevent_backtracking: assessmentData.prevent_backtracking || false,
          randomize_questions: assessmentData.randomize_questions || false,
          time_limit: assessmentData.time_limit !== null ? assessmentData.time_limit : null,
        });
        
        // Fetch sections
        const { data: sectionData, error: sectionError } = await supabase
          .from("assessment_sections")
          .select("*")
          .eq("assessment_id", assessmentId)
          .order("created_at", { ascending: true });
        
        if (sectionError) {
          throw sectionError;
        }
        
        setSections(sectionData || []);
      } catch (error: any) {
        console.error("Error loading assessment:", error.message);
        setLoadingError(`Failed to load assessment: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadAssessment();
  }, [assessmentId]);

  // Refresh sections if needed
  const refreshSections = async () => {
    try {
      if (!assessmentId) return;
      
      const { data, error } = await supabase
        .from("assessment_sections")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      setSections(data || []);
    } catch (error: any) {
      console.error("Error refreshing sections:", error.message);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Loading message="Loading assessment details..." />
      </MainLayout>
    );
  }

  if (loadingError) {
    return (
      <MainLayout>
        <ErrorMessage 
          title="Assessment Not Found"
          message={loadingError}
          backUrl="/assessments"
          backLabel="Back to Assessments"
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assessment Details</h1>
            <p className="text-muted-foreground mt-2">
              View and edit assessment information
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/assessments">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Assessments
            </Link>
          </Button>
        </div>

        <Card>
          {loading ? (
            <Loading />
          ) : loadingError ? (
            <ErrorMessage message={loadingError} />
          ) : formData && (
            <AssessmentForm 
              assessmentId={assessmentId || ""} 
              initialData={formData}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['assessments'] });
              }} 
            />
          )}
        </Card>

        {/* Add the new AssessmentStats component */}
        <AssessmentStats assessmentId={assessmentId || ""} />

        <SectionsList 
          assessmentId={assessmentId || ""} 
          sections={sections} 
        />

        <AssessmentResultsSummary assessmentId={assessmentId || ""} />
      </div>
    </MainLayout>
  );
};

export default AssessmentDetails;
