import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  ArrowRight,
  FileText,
} from "lucide-react";
import { AssessmentWithStats } from "@/types";

interface AssessmentListProps {
  assessments: AssessmentWithStats[];
  isLoading: boolean;
}

const AssessmentList: React.FC<AssessmentListProps> = ({
  assessments,
  isLoading,
}) => {
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Assessments</CardTitle>
          <CardDescription>
            Recently updated assessments and quizzes
          </CardDescription>
        </div>
        <Button size="sm" className="h-8" asChild>
          <Link to="/assessments">
            View All
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading assessments...</div>
          ) : assessments && assessments.length > 0 ? (
            assessments.map((assessment: AssessmentWithStats) => (
              <div 
                key={assessment.id}
                className="border rounded-lg p-3 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{assessment.title}</h4>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="text-xs">
                        {assessment.difficulty || "Standard"}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-2">
                        Updated: {formatDate(assessment.updated_at)}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                    <Link to={`/assessments/${assessment.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-muted-foreground mr-1" />
                    <span>{assessment.submissions || 0} submissions</span>
                  </div>
                  <div className="font-medium">
                    Avg: {assessment.avgScore || 0}%
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">No assessments found</div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link to="/assessments">
            View All Assessments
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AssessmentList;
