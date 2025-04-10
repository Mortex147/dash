import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../components/ui/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Json } from '../../integrations/supabase/types';
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Label } from "../../components/ui/label";

interface Question {
  id: string;
  section_id: string;
  text: string;
  options: Json;
  correct_answer: number;
  time_limit: number | null;
  created_at?: string;
  updated_at?: string;
}

interface QuestionFormState extends Omit<Question, 'options'> {
  options: string[];
}

export default function QuestionDetails() {
  const { questionId } = useParams<{ questionId?: string }>();
  console.log('QuestionDetails render - useParams result:', useParams());
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState<QuestionFormState | null>(null);

  const handleOptionChange = (index: number, value: string) => {
    setQuestion(prev => {
      if (!prev) return null;
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  };

  const addOption = () => {
    setQuestion(prev => {
      if (!prev) return null;
      if (prev.options[prev.options.length - 1] === '') {
        toast({ title: "Info", description: "Fill the last option before adding a new one.", variant: "default" });
        return prev;
      }
      return { ...prev, options: [...prev.options, ''] };
    });
  };

  const removeOption = (index: number) => {
    setQuestion(prev => {
      if (!prev || prev.options.length <= 1) return prev;
      const newOptions = prev.options.filter((_, i) => i !== index);
      let newCorrectAnswer = prev.correct_answer;
      if (index === prev.correct_answer) {
        newCorrectAnswer = 0;
      } else if (index < prev.correct_answer) {
        newCorrectAnswer = prev.correct_answer - 1;
      }
      return { ...prev, options: newOptions, correct_answer: newCorrectAnswer };
    });
  };

  const handleCorrectAnswerChange = (value: string) => {
    const index = parseInt(value);
    if (!isNaN(index)) {
      setQuestion(prev => prev ? { ...prev, correct_answer: index } : null);
    }
  };

  useEffect(() => {
    // Prioritize getting sectionId from location.state
    const state = location.state as { sectionId?: string }; // Type assertion
    const sectionIdFromState = state?.sectionId;

    // Fallback to URL parameters if state is missing
    const sectionIdFromParams = searchParams.get('sectionId');
    const paramsFromLocation = new URLSearchParams(location.search);
    const sectionIdFromLocation = paramsFromLocation.get('sectionId');
    
    const currentSectionId = sectionIdFromState || sectionIdFromParams || sectionIdFromLocation; 

    console.log('useEffect start - questionId:', questionId, 'sectionId from state:', sectionIdFromState, 'from searchParams:', sectionIdFromParams, 'from location:', sectionIdFromLocation, 'using:', currentSectionId);

    if (!currentSectionId) {
      console.log('useEffect: sectionId missing from all sources (state, params, location)');
      toast({
        title: "Error",
        description: "Section ID is required and was not found.", // Updated message
        variant: "destructive",
      });
      navigate(-1);
      return;
    }

    const isNewQuestion = questionId === 'create';
    console.log('useEffect - isNewQuestion flag:', isNewQuestion, '(checking for "create")');

    if (isNewQuestion) {
      console.log('useEffect: Initializing new question state');
      setQuestion({
        id: '',
        section_id: currentSectionId,
        text: '',
        options: ['', ''],
        correct_answer: 0,
        time_limit: 60
      });
      console.log('useEffect: Calling setLoading(false) for new question');
      setLoading(false);
    }
    else if (questionId && questionId !== 'create') {
      console.log('useEffect: Preparing to load existing question with ID:', questionId);
      const loadQuestion = async () => {
        console.log('loadQuestion: Fetching...');
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('id', questionId)
            .single<Question>();

          if (error) {
            console.error('loadQuestion: Supabase error:', error);
            throw error;
          }
          console.log('loadQuestion: Data received:', data);
          const loadedOptions = Array.isArray(data.options) ? data.options.map(String) : [];
          setQuestion({
            ...data,
            options: loadedOptions,
            time_limit: data.time_limit ?? null
          });
        } catch (error) {
          console.error('Error loading question catch block:', error);
          toast({
            title: "Error",
            description: "Failed to load question data.",
            variant: "destructive",
          });
        } finally {
          console.log('loadQuestion: Calling setLoading(false) in finally block');
          setLoading(false);
        }
      };

      loadQuestion();
    } else {
      console.error('useEffect: Invalid state - questionId is not \'create\' and not a valid ID:', questionId);
      toast({ title: "Error", description: "Invalid Question URL path.", variant: "destructive" });
      setLoading(false);
      navigate(-1);
    }
  }, [questionId, searchParams, location.search, location.state, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Also prioritize state here
    const state = location.state as { sectionId?: string };
    const sectionIdFromState = state?.sectionId;
    const sectionIdFromParams = searchParams.get('sectionId');
    const paramsFromLocation = new URLSearchParams(location.search);
    const sectionIdFromLocation = paramsFromLocation.get('sectionId');
    const submitSectionId = sectionIdFromState || sectionIdFromParams || sectionIdFromLocation;

    if (!question || !submitSectionId) {
      console.error("Submit Error: Missing question state or sectionId", { questionExists: !!question, submitSectionId });
      toast({ title: "Error", description: "Cannot save: Critical information missing.", variant: "destructive" });
      return;
    }

    if (question.correct_answer < 0 || question.correct_answer >= question.options.length) {
      toast({ title: "Validation Error", description: "Selected correct answer is invalid.", variant: "destructive" });
      return;
    }
    if (question.options.some(opt => opt.trim() === '')) {
      toast({ title: "Validation Error", description: "All options must be filled in.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const isNewQuestion = questionId === 'create';
      
      const dataToSave: Omit<Question, 'id' | 'created_at' | 'updated_at'> = {
        section_id: submitSectionId,
        text: question.text,
        options: question.options,
        correct_answer: question.correct_answer,
        time_limit: question.time_limit
      };

      if (isNewQuestion) {
        console.log("handleSubmit: Creating new question...");
        const { error } = await supabase.from('questions').insert([dataToSave]);
        if (error) throw error;
        toast({ title: "Success", description: "Question created successfully" });
      } else {
        console.log("handleSubmit: Updating existing question...");
        const { error } = await supabase.from('questions').update(dataToSave).eq('id', questionId);
        if (error) throw error;
        toast({ title: "Success", description: "Question updated successfully" });
      }
      navigate(-1);
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: "Error",
        description: "Failed to save question",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="container mx-auto py-6 text-center text-red-500">
        Error: Question data could not be loaded or initialized.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">
        {questionId === 'create' ? 'Create New Question' : 'Edit Question'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Question Text</label>
          <Textarea
            value={question.text}
            onChange={(e) => {
              const newText = e.target.value;
              setQuestion(prev => prev ? { ...prev, text: newText } : null);
            }}
            required
          />
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-medium mb-2">Options & Correct Answer</label>
          <RadioGroup value={question.correct_answer.toString()} onValueChange={handleCorrectAnswerChange}>
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="sr-only">Set option {index + 1} as correct</Label>
                <Input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-grow"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                  disabled={question.options.length <= 1}
                  title="Remove Option"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </RadioGroup>
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus className="h-4 w-4 mr-1" /> Add Option
          </Button>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Time Limit (seconds, optional)</label>
          <Input
            type="number"
            value={question.time_limit ?? ''}
            onChange={(e) => {
              const rawValue = e.target.value;
              const newTimeLimit = rawValue === '' ? null : parseInt(rawValue);
              setQuestion(prev => prev
                  ? { ...prev, time_limit: (newTimeLimit === null || isNaN(newTimeLimit)) ? null : newTimeLimit }
                  : null
              );
            }}
            placeholder="e.g., 60"
            min="0"
          />
        </div>
        <div className="flex gap-4 pt-4 border-t">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {questionId === 'create' ? 'Create Question' : 'Update Question'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
} 