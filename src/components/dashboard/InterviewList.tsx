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
  Calendar,
  User,
} from "lucide-react";
import { Interview } from "@/types";

interface InterviewListProps {
  interviews: Interview[];
  isLoading: boolean;
}

const InterviewList: React.FC<InterviewListProps> = ({
  interviews,
  isLoading,
}) => {
  // Format datetime for display
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  
  // Get interview status badge component based on status string
  const getInterviewStatusBadge = (status: Interview['status']) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-green-100 text-green-800">
            Confirmed
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-100 text-red-800">
            Cancelled
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Interviews</CardTitle>
        <CardDescription>
          Scheduled interviews with candidates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading interviews...</div>
          ) : interviews && interviews.length > 0 ? (
            interviews.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {interview.candidateName ? 
                      interview.candidateName.split(' ').map((n) => n[0]).join('').toUpperCase() : 
                      <User className="h-5 w-5" />
                    }
                  </div>
                  <div className="ml-3">
                    <p className="font-medium">{interview.candidateName || "Candidate"}</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDateTime(interview.scheduledAt)}
                    </div>
                  </div>
                </div>
                <div>
                  {getInterviewStatusBadge(interview.status)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">No upcoming interviews</div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link to="/interviews">
            Manage Interviews
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InterviewList;
