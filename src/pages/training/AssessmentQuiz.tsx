import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle, Clock } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  timeLimit?: number;
}

interface Section {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  timeLimit: number;
  randomizeQuestions: boolean;
  preventBacktracking: boolean;
  sections: Section[];
}

const AssessmentQuiz = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [answerTimings, setAnswerTimings] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const assessmentStartTimeRef = useRef<string | null>(null);
  
  const [preventTabChange, setPreventTabChange] = useState(false);
  
  useEffect(() => {
    if (assessmentId && user) {
      fetchAssessment();
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [assessmentId, user]);
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (preventTabChange && assessmentStarted && !assessmentCompleted) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [preventTabChange, assessmentStarted, assessmentCompleted]);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (assessmentStarted && !assessmentCompleted && document.visibilityState === "hidden") {
        toast.error("Warning: Leaving the test page may result in disqualification!", {
          duration: 5000,
        });
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [assessmentStarted, assessmentCompleted]);
  
  const fetchAssessment = async () => {
    try {
      setIsLoading(true);
      
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();
      
      if (assessmentError) throw assessmentError;
      
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('assessment_sections')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('created_at', { ascending: true });
      
      if (sectionsError) throw sectionsError;
      
      const sections: Section[] = [];
      
      for (const section of sectionsData) {
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('section_id', section.id);
          
        if (questionsError) throw questionsError;
        
        const questions = questionsData.map((q: any) => ({
          id: q.id,
          text: q.text,
          options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
          correctAnswer: q.correct_answer,
          timeLimit: q.time_limit
        }));
        
        const randomizedQuestions = assessmentData.randomize_questions 
          ? shuffleArray([...questions]) 
          : questions;
        
        sections.push({
          id: section.id,
          title: section.title,
          description: section.description,
          questions: randomizedQuestions
        });
      }
      
      setAssessment({
        id: assessmentData.id,
        title: assessmentData.title,
        description: assessmentData.description,
        timeLimit: assessmentData.time_limit || 30,
        randomizeQuestions: assessmentData.randomize_questions,
        preventBacktracking: assessmentData.prevent_backtracking,
        sections
      });
      
      if (sections.length > 0 && sections[0].questions.length > 0) {
        const questionTimeLimit = sections[0].questions[0].timeLimit || assessmentData.time_limit || 30;
        setTimeRemaining(questionTimeLimit);
      }
      
    } catch (error: any) {
      toast.error("Failed to load assessment");
      console.error("Error fetching assessment:", error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const startAssessment = () => {
    assessmentStartTimeRef.current = new Date().toISOString();
    setAssessmentStarted(true);
    setPreventTabChange(true);
    startTimer();
  };
  
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    startTimeRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const handleAutoSubmit = () => {
    handleSubmitAnswer();
  };
  
  const getCurrentQuestion = (): Question | null => {
    if (!assessment || 
        !assessment.sections[currentSectionIndex] || 
        !assessment.sections[currentSectionIndex].questions[currentQuestionIndex]) {
      return null;
    }
    
    return assessment.sections[currentSectionIndex].questions[currentQuestionIndex];
  };
  
  const handleSubmitAnswer = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;
    
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    
    const newAnswers = { ...answers };
    const newTimings = { ...answerTimings };
    
    if (selectedAnswer !== null) {
      newAnswers[currentQuestion.id] = selectedAnswer;
    }
    console.log(`[AssessmentQuiz] Saving answer for Q:${currentQuestion.id}. Selected Index:`, selectedAnswer);
    
    newTimings[currentQuestion.id] = timeTaken;
    
    setAnswers(newAnswers);
    setAnswerTimings(newTimings);
    
    const nextQuestionIndex = currentQuestionIndex + 1;
    const currentSection = assessment?.sections[currentSectionIndex];
    
    if (currentSection && nextQuestionIndex < currentSection.questions.length) {
      setCurrentQuestionIndex(nextQuestionIndex);
      setSelectedAnswer(null);
      
      const nextQuestion = currentSection.questions[nextQuestionIndex];
      const questionTimeLimit = nextQuestion.timeLimit || assessment?.timeLimit || 30;
      setTimeRemaining(questionTimeLimit);
      startTimer();
    } else {
      const nextSectionIndex = currentSectionIndex + 1;
      
      if (assessment && nextSectionIndex < assessment.sections.length) {
        setCurrentSectionIndex(nextSectionIndex);
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        
        const nextSection = assessment.sections[nextSectionIndex];
        if (nextSection.questions.length > 0) {
          const nextQuestion = nextSection.questions[0];
          const questionTimeLimit = nextQuestion.timeLimit || assessment.timeLimit || 30;
          setTimeRemaining(questionTimeLimit);
          startTimer();
        }
      } else {
        await submitAssessment(newAnswers, newTimings);
      }
    }
  };
  
  const submitAssessment = async (
    finalAnswers: Record<string, number>,
    finalTimings: Record<string, number>
  ) => {
    try {
      setIsSubmitting(true);
      
      let totalQuestions = 0;
      let correctAnswers = 0;
      
      assessment?.sections.forEach(section => {
        section.questions.forEach(question => {
          totalQuestions++;
          
          // Ensure both values are compared as numbers
          const selectedAnswerIndex = finalAnswers[question.id];
          const correctAnswerIndex = question.correctAnswer;
          
          // --- Detailed Logging Start ---
          // console.log(`[AssessmentQuiz] Comparing Q:${question.id}`);
          // console.log(`  -> Selected Index (raw):`, selectedAnswerIndex, typeof selectedAnswerIndex);
          // console.log(`  -> Correct Index (raw):`, correctAnswerIndex, typeof correctAnswerIndex);
          // console.log(`  -> Comparison: Number(${selectedAnswerIndex}) === Number(${correctAnswerIndex})`);
          // --- Detailed Logging End ---
          
          if (selectedAnswerIndex !== undefined && 
              selectedAnswerIndex !== null &&
              correctAnswerIndex !== undefined && 
              correctAnswerIndex !== null && 
              Number(selectedAnswerIndex) === Number(correctAnswerIndex)) {
            correctAnswers++;
            // Log if correct
            // console.log(`  -> CORRECT! Incrementing score.`);
          } else {
            // Log if incorrect
            // console.log(`  -> INCORRECT! Score not incremented.`);
          }
        });
      });
      
      const calculatedScore = (correctAnswers / totalQuestions) * 100;
      // console.log(`[AssessmentQuiz] Final Calculation: Correct=${correctAnswers}, Total=${totalQuestions}, Score=${calculatedScore}`); // Log final calc
      setScore(calculatedScore);
      
      if (user && assessment && assessmentStartTimeRef.current) {
        const { data: candidateData, error: candidateError } = await supabase
          .from('candidates')
          .select('id')
          .eq('id', user.id)
          .single();
          
        if (candidateError) throw candidateError;
        
        const { error: resultError } = await supabase
          .from('assessment_results')
          .insert({
            candidate_id: candidateData.id,
            assessment_id: assessment.id,
            score: calculatedScore,
            answers: finalAnswers,
            answer_timings: finalTimings,
            completed: true,
            started_at: assessmentStartTimeRef.current,
            completed_at: new Date().toISOString()
          });
          
        if (resultError) throw resultError;
        
        const { error: activityError } = await supabase
          .from('activity_logs')
          .insert({
            user_id: user.id,
            action: 'Completed Assessment',
            entity_type: 'assessment',
            entity_id: assessment.id,
            details: { score: calculatedScore }
          });
          
        if (activityError) throw activityError;
      } else {
        console.error("Cannot submit assessment: User, assessment, or start time is missing.");
        toast.error("Submission failed: Missing required information.");
      }
      
      setAssessmentCompleted(true);
      setPreventTabChange(false);
      
      toast.success("Assessment completed successfully!");
      
    } catch (error: any) {
      toast.error("Failed to submit assessment");
      console.error("Error submitting assessment:", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleOptionSelect = (optionIndex: number) => {
    setSelectedAnswer(optionIndex);
  };
  
  const getProgressPercentage = (): number => {
    if (!assessment) return 0;
    
    let totalQuestions = 0;
    let completedQuestions = 0;
    
    assessment.sections.forEach(section => {
      totalQuestions += section.questions.length;
    });
    
    for (let i = 0; i < currentSectionIndex; i++) {
      completedQuestions += assessment.sections[i].questions.length;
    }
    
    completedQuestions += currentQuestionIndex;
    
    return Math.round((completedQuestions / totalQuestions) * 100);
  };
  
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }
  
  if (!assessment) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Assessment not found or unable to load assessment data.
            </AlertDescription>
          </Alert>
          <Button 
            className="mt-4" 
            onClick={() => navigate("/training")}
          >
            Return to Training
          </Button>
        </div>
      </MainLayout>
    );
  }
  
  if (assessmentCompleted) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-8">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">Assessment Completed</CardTitle>
              <CardDescription>
                Thank you for completing the assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center my-8">
                <div className={`text-6xl font-bold ${score && score >= 70 ? 'text-green-500' : 'text-red-500'}`}>
                  {score !== null ? Math.round(score) : 0}%
                </div>
                <p className="text-lg mt-2">
                  {score && score >= 70 ? 'Congratulations! You passed the assessment.' : 'You did not pass the assessment. Please review the material and try again.'}
                </p>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Assessment Feedback</AlertTitle>
                <AlertDescription>
                  Your answers and results have been submitted. The manager will review your performance and provide additional feedback if needed.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => navigate("/training")}
              >
                Return to Training
              </Button>
            </CardFooter>
          </Card>
        </div>
      </MainLayout>
    );
  }
  
  if (!assessmentStarted) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-8">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">{assessment.title}</CardTitle>
              <CardDescription>
                {assessment.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 text-blue-700 p-4 rounded-md border border-blue-200">
                <h3 className="text-lg font-semibold mb-2">Assessment Instructions</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>This assessment contains {assessment.sections.reduce((acc, section) => acc + section.questions.length, 0)} questions across {assessment.sections.length} sections.</li>
                  <li>Each question has a time limit of {assessment.timeLimit} seconds.</li>
                  <li>If time runs out, your current answer will be automatically submitted.</li>
                  <li>You cannot go back to previous questions once submitted.</li>
                  <li>Leaving the assessment page may result in disqualification.</li>
                  <li>Ensure you have a stable internet connection before starting.</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Assessment Sections:</h3>
                <ul className="space-y-2">
                  {assessment.sections.map((section, index) => (
                    <li key={section.id} className="border p-3 rounded-md">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{section.title}</h4>
                          <p className="text-sm text-muted-foreground">{section.description}</p>
                          <p className="text-xs mt-1">{section.questions.length} questions</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important Note</AlertTitle>
                <AlertDescription>
                  Once you start the assessment, do not refresh the page or navigate away as it may result in disqualification.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                className="w-full" 
                onClick={startAssessment}
              >
                Start Assessment
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate("/training")}
              >
                Return to Training
              </Button>
            </CardFooter>
          </Card>
        </div>
      </MainLayout>
    );
  }
  
  const currentQuestion = getCurrentQuestion();
  const currentSection = assessment.sections[currentSectionIndex];
  
  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <Badge variant="outline" className="mb-2">
                  Section {currentSectionIndex + 1}/{assessment.sections.length}: {currentSection.title}
                </Badge>
                <CardTitle>Question {currentQuestionIndex + 1}/{currentSection.questions.length}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={timeRemaining < 10 ? "destructive" : "outline"}>
                  <Clock className="mr-1 h-4 w-4" />
                  {timeRemaining}s
                </Badge>
              </div>
            </div>
            <Progress value={getProgressPercentage()} className="mt-2" />
          </CardHeader>
          
          {currentQuestion && (
            <CardContent className="space-y-6">
              <div className="text-lg font-medium">{currentQuestion.text}</div>
              
              <RadioGroup
                value={selectedAnswer?.toString() || ""}
                onValueChange={(value) => handleOptionSelect(parseInt(value))}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50">
                    <RadioGroupItem id={`option-${index}`} value={index.toString()} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          )}
          
          <CardFooter className="pt-6">
            <Button 
              className="w-full"
              onClick={handleSubmitAnswer}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Answer"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AssessmentQuiz;
