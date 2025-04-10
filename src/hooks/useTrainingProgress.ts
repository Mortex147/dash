import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner'; // Use sonner for consistency if used elsewhere

// Reusable types (consider moving to a shared types file if used elsewhere)
interface Video {
  id: string;
  title: string;
  description: string | null;
  url: string;
  duration: string | null;
  module: string;
}

export interface TrainingModuleProgress {
  id: string; // Module definition ID
  title: string;
  description: string | null;
  module: string; // The category identifier (e.g., 'product')
  progress: number; // 0 or 100 based on quiz completion
  status: 'completed' | 'in_progress' | 'locked';
  locked: boolean;
  videos: Video[];
  quizId: string | null; // Store associated quiz ID
}

export interface TrainingProgressState {
  product: number;
  sales: number;
  relationship: number;
  overall: number;
}

// Define the return type of the hook
interface UseTrainingProgressReturn {
  trainingModules: TrainingModuleProgress[];
  progress: TrainingProgressState;
  isLoading: boolean;
  error: string | null;
  refetch: () => void; // Function to manually refetch data
}

// Define the order of modules - IMPORTANT: Must match module values in DB
const moduleOrder = ['product', 'sales', 'relationship'];

export const useTrainingProgress = (): UseTrainingProgressReturn => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [trainingModules, setTrainingModules] = useState<TrainingModuleProgress[]>([]);
  const [progress, setProgress] = useState<TrainingProgressState>({
    product: 0,
    sales: 0,
    relationship: 0,
    overall: 0,
  });

  const fetchTrainingData = useCallback(async () => {
    // Ensure user context is loaded before fetching
    if (!user?.id) {
      // If no user ID yet, don't treat as error, just wait.
      // Keep loading true if it was already true.
      // console.log("Hook: Waiting for user ID...");
      // setIsLoading(true); // Keep loading until user ID is available
      return;
    }

    console.log("Hook: Fetching training data for user:", user.id);
    setIsLoading(true);
    setError(null);

    try {
      // --- Fetch all data concurrently ---
      const [moduleResult, videoResult, completedResult] = await Promise.all([
        supabase
          .from('training_modules')
          .select('*, quiz_id')
          .order('created_at', { ascending: true }),
        supabase
          .from('videos')
          .select('*'),
        supabase
          .from('assessment_results')
          .select('assessment_id')
          .eq('candidate_id', user.id)
          .eq('completed', true)
      ]);

      // --- Check for errors after all promises settle ---
      if (moduleResult.error) throw new Error(`Module definitions fetch failed: ${moduleResult.error.message}`);
      if (videoResult.error) throw new Error(`Videos fetch failed: ${videoResult.error.message}`);
      if (completedResult.error) throw new Error(`Completed results fetch failed: ${completedResult.error.message}`);

      const moduleDefinitions = moduleResult.data;
      const videoData = videoResult.data;
      const completedResultsData = completedResult.data;

      console.log("Hook: Fetched Module Definitions:", moduleDefinitions);
      console.log("Hook: Fetched Video Data:", videoData);
      console.log("Hook: Fetched Completed Results:", completedResultsData);

      // --- Process the data ---
      const completedAssessmentIds = new Set(completedResultsData?.map(r => r.assessment_id) || []);
      console.log("Hook: Completed Assessment IDs Set:", completedAssessmentIds);

      const moduleVideoMap: Record<string, Video[]> = {};
      videoData?.forEach((video: any) => { // Use 'any' temporarily if Video type causes issues
        const moduleKey = video.module;
        if (!moduleVideoMap[moduleKey]) {
          moduleVideoMap[moduleKey] = [];
        }
        moduleVideoMap[moduleKey].push(video as Video);
      });
      console.log("Hook: Module Video Map:", moduleVideoMap);

      // --- Format modules with sequential locking ---
      let previousModuleCompleted = true;
      const formattedModules: TrainingModuleProgress[] = moduleOrder.map(moduleKey => {
          const modDef = moduleDefinitions?.find(m => m.module === moduleKey);
          if (!modDef) {
              console.warn(`Hook: Module definition NOT FOUND for key: ${moduleKey}`);
              return null; // Skip if module definition not found
          }

          const videosForModule = moduleVideoMap[moduleKey] || [];
          const associatedQuizId = modDef.quiz_id;
          const isModuleComplete = associatedQuizId ? completedAssessmentIds.has(associatedQuizId) : false;
          const moduleProg = isModuleComplete ? 100 : 0;
          const locked = !previousModuleCompleted;
          const currentStatus = locked ? 'locked' : (isModuleComplete ? 'completed' : 'in_progress');

          // Update completion status for the next iteration's lock check
          if (!locked) {
              previousModuleCompleted = isModuleComplete;
          } else {
              previousModuleCompleted = false; // If current is locked, next must be locked
          }

          return {
             id: modDef.id,
             title: modDef.title,
             description: modDef.description,
             module: modDef.module,
             progress: moduleProg,
             status: currentStatus,
             locked: locked,
             videos: videosForModule,
             quizId: associatedQuizId
          };
      }).filter((m): m is TrainingModuleProgress => m !== null); // Filter out nulls if def not found

      // --- Calculate overall progress ---
      const totalModules = formattedModules.length;
      const completedModulesCount = formattedModules.filter(m => m.progress === 100).length;
      const overallProgress = totalModules > 0 ? Math.round((completedModulesCount / totalModules) * 100) : 0;

      const newProgressState = {
        product: formattedModules.find(m => m.module === 'product')?.progress ?? 0,
        sales: formattedModules.find(m => m.module === 'sales')?.progress ?? 0,
        relationship: formattedModules.find(m => m.module === 'relationship')?.progress ?? 0,
        overall: overallProgress
      };

      console.log("Hook: Final Formatted Modules:", formattedModules);
      console.log("Hook: Final Progress State:", newProgressState);

      // --- Update State ---
      setTrainingModules(formattedModules);
      setProgress(newProgressState);
      setError(null); // Clear previous errors on success

    } catch (error: any) {
      console.error("Hook: Error fetching training data:", error);
      setError(error.message || "Failed to load training data.");
      toast.error("Failed to load training data: " + error.message);
      // Optionally keep stale data on error:
      // setTrainingModules([]); // Clear data on error?
      // setProgress({ product: 0, sales: 0, relationship: 0, overall: 0 });
    } finally {
      setIsLoading(false);
      console.log("Hook: Fetch complete. isLoading:", false);
    }
  }, [user?.id]); // Depend only on user ID

  // Effect to fetch data on mount or when user ID changes
  useEffect(() => {
    // Wait for user context to be loaded
    if(user === undefined) {
        console.log("Hook: User context is undefined, waiting...");
        setIsLoading(true); // Ensure loading is true while waiting for user
        return; // Don't fetch yet
    }
     // If user is null after context loaded, means not logged in
    if (user === null) {
        console.log("Hook: User is null, not logged in.");
        setIsLoading(false); // Stop loading, nothing to fetch
        setError("User not authenticated."); // Set appropriate error
        setTrainingModules([]); // Clear any stale data
        setProgress({ product: 0, sales: 0, relationship: 0, overall: 0 });
        return;
    }
    // If user object is present (logged in), fetch data
    fetchTrainingData();

  }, [user, fetchTrainingData]); // Depend on user object itself and fetch callback

  // Return state and refetch function
  return { trainingModules, progress, isLoading, error, refetch: fetchTrainingData };
};
