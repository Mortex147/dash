import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Loader2 } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

interface AssessmentResult {
  id: string;
  candidate_id: string;
  score: number;
  completed: boolean;
  completed_at: string | null;
  profiles?: { name?: string | null } | null;
}

interface AssessmentResultsSummaryProps {
  assessmentId: string;
}

const AssessmentResultsSummary: React.FC<AssessmentResultsSummaryProps> = ({ assessmentId }) => {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!assessmentId) {
        setError("Assessment ID is missing.");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: dbError } = await supabase
          .from('assessment_results')
          .select(`
            id,
            candidate_id,
            score,
            completed,
            completed_at,
            candidates!assessment_results_candidate_id_fkey ( profiles!candidates_id_fkey ( name ) ) 
          `)
          .eq('assessment_id', assessmentId)
          .order('completed_at', { ascending: false, nullsFirst: false });
          
        if (dbError) throw dbError;
        
        setResults(data || []);
      } catch (err: any) {
        console.error("Error fetching assessment results:", err);
        setError("Failed to load results. " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [assessmentId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment Results</CardTitle>
        <CardDescription>
          Summary of submissions for this assessment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-center text-red-500 py-4">{error}</p>
        ) : results.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No results submitted for this assessment yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>{result.candidates?.profiles?.name || result.candidate_id}</TableCell>
                  <TableCell>{result.completed ? 'Completed' : 'In Progress'}</TableCell>
                  <TableCell>{result.completed ? result.score : 'N/A'}</TableCell>
                  <TableCell>
                    {result.completed_at ? 
                      formatDistanceToNow(new Date(result.completed_at), { addSuffix: true }) 
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/assessments/results/${result.id}`} title="View Details">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AssessmentResultsSummary;
