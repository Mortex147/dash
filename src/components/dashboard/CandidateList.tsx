import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Clock,
} from "lucide-react";

interface CandidateListProps {
  candidates: any[];
  isLoading: boolean;
  role: string;
}

const CandidateList: React.FC<CandidateListProps> = ({
  candidates,
  isLoading,
  role,
}) => {
  console.log("CandidateList received candidates:", candidates);
  console.log("CandidateList isLoading:", isLoading);

  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    if (expandedCandidate === id) {
      setExpandedCandidate(null);
    } else {
      setExpandedCandidate(id);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Get status badge component based on status string
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "applied":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            Applied
          </Badge>
        );
      case "screening":
      case "hr_review":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" /> Screening
          </Badge>
        );
      case "hr_approved":
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
      case "final_interview":
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
      default:
        return null;
    }
  };

  // Get average test score from a candidate's assessment results
  const getCandidateScore = (candidate: any) => {
    if (!candidate.assessment_results || candidate.assessment_results.length === 0) {
      return "N/A";
    }
    
    const scores = candidate.assessment_results
      .filter((result: any) => result.score !== null)
      .map((result: any) => result.score);
    
    if (scores.length === 0) return "N/A";
    
    const avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
    return `${avgScore}%`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>
              {role?.toLowerCase() === 'director'
                ? "All Candidates Overview"
                : role?.toLowerCase() === 'manager' 
                  ? "Your Assigned Candidates" 
                  : "Candidates Awaiting Review"
              }
            </CardTitle>
            <CardDescription>
              {role?.toLowerCase() === 'director'
                ? "View all candidates across all stages."
                : role?.toLowerCase() === 'manager'
                  ? "Review candidates assigned to you for next steps."
                  : "Review and screen new candidates."
              }
            </CardDescription>
          </div>
          <Button size="sm" className="h-8" asChild>
            <Link to="/candidates">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Applied</TableHead>
                <TableHead className="hidden md:table-cell">Test Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Loading candidates...
                  </TableCell>
                </TableRow>
              ) : candidates && candidates.length > 0 ? (
                candidates.slice(0, 5).map((candidate: any) => (
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
                            <div className="font-medium">{candidate.profiles?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {candidate.candidate_profile?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(candidate.status)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDate(candidate.updated_at)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getCandidateScore(candidate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/candidates/${candidate.id}`}>
                            Review
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedCandidate === candidate.id && (
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={5} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">Application Details</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Step:</span>
                                  <span>Step {candidate.current_step} of 5</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Test Score:</span>
                                  <span>{getCandidateScore(candidate)}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2">Actions</h4>
                              <div className="space-y-2">
                                <Button size="sm" variant="default" className="w-full justify-start" asChild>
                                  <Link to={`/candidates/${candidate.id}`}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </Link>
                                </Button>
                                <Button size="sm" variant="outline" className="w-full justify-start" asChild>
                                  <Link to={`/candidates/${candidate.id}`}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
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
                    No candidates pending review
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CandidateList;
