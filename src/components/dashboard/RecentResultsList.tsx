import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye } from 'lucide-react';

// Type definition matching the data fetched in DirectorDashboard
type DirectorAssessmentEntry = {
  id: string; // Result ID
  assessmentTitle: string;
  candidateName: string;
  score: number | null;
  completed: boolean;
  completedAt: string | null;
};

interface RecentResultsListProps {
  results: DirectorAssessmentEntry[];
  isLoading: boolean;
}

const RecentResultsList: React.FC<RecentResultsListProps> = ({ results, isLoading }) => {

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null || isNaN(score)) {
      return <Badge variant="secondary">Not Scored</Badge>;
    }
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    if (score >= 80) variant = 'default'; // Assuming default is greenish
    else if (score >= 60) variant = 'outline'; // Assuming outline is yellowish/neutral
    else variant = 'destructive';

    return <Badge variant={variant}>{score}%</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Assessment Results</CardTitle>
        <CardDescription>Latest completed assessment submissions.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading results...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Completed At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length > 0 ? (
                results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{result.candidateName}</TableCell>
                    <TableCell>{result.assessmentTitle}</TableCell>
                    <TableCell>{getScoreBadge(result.score)}</TableCell>
                    <TableCell>{formatDateTime(result.completedAt)}</TableCell>
                    <TableCell>
                      {/* Link to the specific assessment result detail page */}
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/assessments/results/${result.id}`}>
                          <Eye className="h-4 w-4 mr-2" /> View Result
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No recent assessment results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentResultsList;
