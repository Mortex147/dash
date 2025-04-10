import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  PlayCircle,
  CheckCircle2,
  Lock,
  Loader2
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useTrainingProgress } from "@/hooks/useTrainingProgress";
import ErrorMessage from "@/components/ui/error-message";
import { toast } from "sonner";

const Training = () => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState("product");

  const { 
    trainingModules,
    progress,
    isLoading,
    error,
    refetch
  } = useTrainingProgress();

  const getYouTubeThumbnail = (url: string): string => {
    if (!url) return "/placeholder.svg";
    try {
      const urlObj = new URL(url);
      let videoId: string | null = null;

      if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.get('v')) {
        videoId = urlObj.searchParams.get('v');
      }

      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`; 
      }
    } catch (e) {
      console.error("Error parsing video URL for thumbnail:", e);
    }
    return "/placeholder.svg"; 
  };

  const handleTakeQuiz = (quizId: string | null) => {
    if (!quizId) {
      toast.info("No quiz associated with this module.");
      return;
    }
    navigate(`/training/assessment/${quizId}`);
  };

  const handleWatchVideo = (moduleId: string, videoId: string) => {
    navigate(`/training/video/${moduleId}/${videoId}`);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[70vh]">
           <Loader2 className="h-12 w-12 animate-spin text-primary" />
           <p className="ml-4 text-muted-foreground">Loading Training Center...</p>
        </div>
      </MainLayout>
    );
  }
  
  if (error) {
     return (
       <MainLayout>
         <ErrorMessage 
           title="Error Loading Training" 
           message={error} 
         />
       </MainLayout>
     );
  }

  const getModuleStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <PlayCircle className="mr-1 h-3 w-3" /> In Progress
          </Badge>
        );
      case "locked":
        return (
          <Badge variant="secondary">
            <Lock className="mr-1 h-3 w-3" /> Locked
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1">Training Center</h1>
          <p className="text-muted-foreground">
            Complete all modules and pass the quizzes to move to the next step
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Training Progress</CardTitle>
            <CardDescription>
              Overall completion across all required modules
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6">
             <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Product Knowledge</span>
                  <span>{progress.product}%</span>
                </div>
                <Progress value={progress.product} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Sales Techniques</span>
                  <span>{progress.sales}%</span>
                </div>
                <Progress value={progress.sales} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Retailer Relationships</span>
                  <span>{progress.relationship}%</span>
                </div>
                <Progress value={progress.relationship} />
              </div>
              <div className="space-y-2 md:col-span-1 md:border-l md:pl-6">
                <div className="flex justify-between text-sm font-bold">
                  <span>Overall Progress</span>
                  <span>{progress.overall}%</span>
                </div>
                <Progress value={progress.overall} />
            </div>
          </CardContent>
        </Card>

        {trainingModules.length > 0 ? (
        <Tabs value={activeModule} onValueChange={setActiveModule}>
          <TabsList className="grid w-full grid-cols-3">
                 {['product', 'sales', 'relationship'].map(moduleKey => {
                     const moduleData = trainingModules.find(m => m.module === moduleKey);
                     return (
                       <TabsTrigger 
                         key={moduleKey} 
                         value={moduleKey} 
                         disabled={!moduleData || moduleData.locked}
                       >
                         {moduleData?.title || (moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1))}
            </TabsTrigger>
                     );
                 })}
          </TabsList>

          {trainingModules.map((module) => (
               <TabsContent key={module.id} value={module.module} className="pt-4">
              <Card>
                <CardHeader>
                      <CardTitle>{module.title}</CardTitle>
                      <CardDescription>{module.description}</CardDescription>
                      <div className="pt-2">{getModuleStatusBadge(module.status)}</div>
                </CardHeader>
                <CardContent>
                     <h4 className="text-lg font-semibold mb-4">Training Videos</h4>
                     {module.videos.length > 0 ? (
                  <div className="grid gap-4">
                    {module.videos.map((video) => (
                      <div 
                        key={video.id} 
                             className={`p-4 border rounded-lg ${module.locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex gap-4">
                          <div className="w-32 h-20 rounded-md bg-muted overflow-hidden flex-shrink-0">
                            <img 
                                   src={getYouTubeThumbnail(video.url)}
                              alt={video.title} 
                              className="w-full h-full object-cover"
                                   onError={(e) => (e.currentTarget.src = '/placeholder.svg')}
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{video.title}</h4>
                                 {video.duration && (
                                     <p className="text-sm text-muted-foreground">Duration: {video.duration}</p>
                                  )}
                          </div>
                          <div className="flex flex-col justify-center">
                            <Button 
                                   onClick={() => handleWatchVideo(module.module, video.id)}
                              variant="outline" 
                              size="sm"
                              className="flex items-center"
                              disabled={module.locked}
                            >
                                   <PlayCircle className="mr-1 h-4 w-4" /> Watch
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                     ) : (
                       <p className="text-muted-foreground text-sm">No videos available for this module yet.</p>
                     )}
                </CardContent>
                    <CardFooter className="border-t pt-4 flex justify-end">
                  <Button 
                        onClick={() => handleTakeQuiz(module.quizId)}
                        disabled={module.locked || !module.quizId || module.status === 'completed'}
                  >
                        {module.status === 'completed' ? "Quiz Completed" : (module.quizId ? "Take Quiz" : "No Quiz")}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
        ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                 No training modules found or assigned.
              </CardContent>
            </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Training;
