import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactPlayer from 'react-player/youtube'; // Import specifically for YouTube or general if needed
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Simplified VideoData type (no watched status needed here)
interface VideoData {
  id: string;
  title: string;
  description: string | null;
  url: string;
  duration: string | null;
  created_at: string;
}

const VideoPlayer = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Still need user potentially for RLS
  const { moduleId, videoId } = useParams<{ moduleId: string; videoId: string }>();
  const playerRef = useRef<ReactPlayer>(null);

  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false); // Player state (optional, for custom controls)
  const [durationSeconds, setDurationSeconds] = useState(0);
  // Removed states: playedSeconds, isWatched, isMarkingWatched

  // Fetch video details from Supabase
  useEffect(() => {
    const fetchVideo = async () => {
      if (!videoId) { // Don't necessarily need user here unless RLS depends on it
        setError("Video ID missing.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch video details
        const { data: videoResult, error: videoError } = await supabase
          .from('videos')
          .select('*')
          .eq('id', videoId)
          .single();

        if (videoError) throw videoError;
        if (!videoResult) throw new Error("Video not found.");

        setVideoData(videoResult as VideoData);

        // Removed watched status check

      } catch (err: any) {
        console.error("Error fetching video:", err);
        setError(err.message || "Failed to load video data.");
        toast.error("Failed to load video data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]); // Dependency only on videoId now

  // Removed markVideoAsWatched function

  // --- ReactPlayer Callbacks (Simplified) ---

  const handleReady = (player: ReactPlayer) => {
    console.log('Player ready');
  };

  const handleDuration = (duration: number) => {
    setDurationSeconds(duration);
  };

  // Removed handleProgress callback (no tracking needed)
  // Removed handleEnded callback (no marking watched needed)
  
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleError = (e: any) => {
    console.error('Video Player Error:', e);
    setError("Failed to load or play video.");
    toast.error("Video playback error.");
  }

  // --- Rendering ---

  const handleBackToTraining = () => {
    navigate('/training');
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[70vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !videoData) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto text-center py-10">
           <Button
             variant="outline"
             className="mb-4 inline-flex items-center"
             onClick={handleBackToTraining}
           >
             <ArrowLeft className="mr-2 h-4 w-4" />
             Back to Training
           </Button>
           <Card className="mt-4">
             <CardHeader>
               <CardTitle className="text-red-600">Error Loading Video</CardTitle>
             </CardHeader>
             <CardContent>
               <p>{error || "Video data could not be found."}</p>
             </CardContent>
           </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="outline"
          className="mb-4 inline-flex items-center"
          onClick={handleBackToTraining}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Training
        </Button>
        
        <Card className="mb-6 overflow-hidden">
          <div className="relative aspect-video bg-black">
            <ReactPlayer
              ref={playerRef}
              url={videoData.url} 
              width='100%'
              height='100%'
              playing={isPlaying} // Still useful for play/pause state if using custom controls
              controls={true} // Using built-in controls is simplest
              onReady={handleReady}
              onDuration={handleDuration}
              // onProgress removed
              // onEnded removed
              onPlay={handlePlay}
              onPause={handlePause}
              onError={handleError}
              config={{
                youtube: {
                  playerVars: { showinfo: 0 } 
                }
              }}
            />
          </div>
          
          <CardHeader>
            <CardTitle>{videoData.title}</CardTitle>
             {durationSeconds > 0 && (
                <CardDescription>
                    {Math.floor(durationSeconds / 60)}m {Math.floor(durationSeconds % 60)}s • Training Material
                </CardDescription>
             )}
          </CardHeader>
          
          <CardContent>
            {videoData.description && (
                <div className="text-sm text-muted-foreground mb-4">
              {videoData.description}
            </div>
            )}
            {/* Progress Bar removed or could be static */}
          </CardContent>
          
          {/* Footer simplified - no watched status needed */}
          <CardFooter className="border-t pt-4 flex justify-end">
             {/* Footer content can be simplified or removed */}
              <Button variant="outline" onClick={handleBackToTraining}>Back to Training</Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default VideoPlayer;
