
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorMessageProps {
  title?: string;
  message: string;
  backUrl?: string;
  backLabel?: string;
  icon?: React.ReactNode;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = "Error",
  message,
  backUrl = "/",
  backLabel = "Back",
  icon = <BookOpen className="h-6 w-6 text-red-600" />
}) => {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center space-y-4 max-w-md text-center">
        <div className="p-3 rounded-full bg-red-50">
          <div className="rounded-full bg-red-100 p-2">
            {icon}
          </div>
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground">{message}</p>
        <Button asChild>
          <Link to={backUrl}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {backLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default ErrorMessage;
