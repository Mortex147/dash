import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Loader2, Upload, FileText, Video } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define schema for form validation
const formSchema = z.object({
  resume: z.string().min(1, "Resume is required"),
  aboutMeVideo: z.string().min(1, "About me video is required"),
  salesPitchVideo: z.string().min(1, "Sales pitch video is required"),
});

const Application = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [candidateStatus, setCandidateStatus] = useState<string | null>(null);
  const [applicationData, setApplicationData] = useState({
    resume: null,
    aboutMeVideo: null,
    salesPitchVideo: null,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Initialize form with react-hook-form
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resume: "",
      aboutMeVideo: "",
      salesPitchVideo: "",
    },
  });

  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingAboutVideo, setUploadingAboutVideo] = useState(false);
  const [uploadingSalesVideo, setUploadingSalesVideo] = useState(false);

  // Helper function to upload a file and get its public URL
  const uploadFileAndGetUrl = async (file: File, path: string): Promise<string | null> => {
    try {
      // 1. Upload the file
      const { error: uploadError } = await supabase.storage
        .from('candidateartifacts') // Use your actual bucket name
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true, // Overwrite if exists for simplicity
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // 2. Get the public URL
      const { data } = supabase.storage
        .from('candidateartifacts') // Use your actual bucket name
        .getPublicUrl(path);

      if (!data?.publicUrl) {
        throw new Error("Could not get public URL after upload.");
      }

      return data.publicUrl;

    } catch (error) {
      console.error("Error during file upload process:", error);
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "An unknown error occurred during upload.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Actual file upload handler for Resume
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) {
      return;
    }
    const file = e.target.files[0];
    const fileExtension = file.name.split('.').pop();
    const filePath = `${user.id}/resume.${fileExtension}`;
    console.log('[handleResumeUpload] Calculated file path:', filePath);
    
    setUploadingResume(true);
    const publicUrl = await uploadFileAndGetUrl(file, filePath);
    setUploadingResume(false);

    if (publicUrl) {
      form.setValue("resume", publicUrl); // Set REAL URL in form
      toast({
        title: "Resume uploaded",
        description: "Your resume has been uploaded successfully.",
      });
    } else {
      // Reset input if upload failed
      e.target.value = ""; 
    }
  };

  // Actual file upload handler for Videos
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "aboutMe" | "salesPitch") => {
     if (!e.target.files || e.target.files.length === 0 || !user) {
      return;
    }
    const file = e.target.files[0];
    const fileExtension = file.name.split('.').pop();
    const fieldName = type === "aboutMe" ? "aboutMeVideo" : "salesPitchVideo";
    const filePath = `${user.id}/${fieldName}.${fileExtension}`;
    console.log(`[handleVideoUpload - ${type}] Calculated file path:`, filePath);
    const setUploading = type === "aboutMe" ? setUploadingAboutVideo : setUploadingSalesVideo;

    setUploading(true);
    const publicUrl = await uploadFileAndGetUrl(file, filePath);
    setUploading(false);

    if (publicUrl) {
      form.setValue(fieldName, publicUrl); // Set REAL URL in form
      toast({
        title: "Video uploaded",
        description: `Your ${type === "aboutMe" ? "about me" : "sales pitch"} video has been uploaded successfully.`,
      });
    } else {
       e.target.value = "";
    }
  };

  useEffect(() => {
    console.log("[Application.tsx] Running useEffect to fetch application data...");
    const fetchApplicationData = async () => {
      if (!user) {
          console.log("[Application.tsx] useEffect - No user, returning.");
         return;
      }
      console.log("[Application.tsx] useEffect - User found, fetching data for:", user.id);

      try {
        const { data, error } = await supabase
          .from("candidates")
          .select("resume, about_me_video, sales_pitch_video, status")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching application data:", error);
          return;
        }

        if (data) {
          setApplicationData({
            resume: data.resume,
            aboutMeVideo: data.about_me_video,
            salesPitchVideo: data.sales_pitch_video,
          });

          // Set the values in the form
          form.setValue("resume", data.resume || "");
          form.setValue("aboutMeVideo", data.about_me_video || "");
          form.setValue("salesPitchVideo", data.sales_pitch_video || "");

          setCandidateStatus(data.status);

          // Check if all required fields are filled to determine if application is submitted
          if (data.resume && data.about_me_video && data.sales_pitch_video) {
            setIsSubmitted(true);
          }
        }
      } catch (error) {
        console.error("Error in fetchApplicationData:", error);
      }
    };

    fetchApplicationData();
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit an application.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("candidates")
        .update({
          resume: values.resume,
          about_me_video: values.aboutMeVideo,
          sales_pitch_video: values.salesPitchVideo,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Application submitted",
        description: "Your application has been submitted successfully.",
      });

      setIsSubmitted(true);
      navigate("/dashboard/candidate");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mock function to simulate saving URLs from external sources
  const saveExternalUrl = (type: "resume" | "aboutMeVideo" | "salesPitchVideo", url: string) => {
    form.setValue(type, url);
    toast({
      title: "URL saved",
      description: `Your ${type === "resume" ? "resume" : type === "aboutMeVideo" ? "about me video" : "sales pitch video"} URL has been saved.`,
    });
  };

  // Determine which alert to show
  const showApplicationRequiredAlert = 
    candidateStatus && // Status must be loaded
    ["applied", "screening"].includes(candidateStatus.toLowerCase()); // Only show if status is initial
  
  const showApplicationSubmittedAlert = isSubmitted; // Show only if form fields were submitted

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Application Form</h1>

        {showApplicationSubmittedAlert ? (
          <Alert className="mb-8">
            <AlertTitle>Application Submitted</AlertTitle>
            <AlertDescription>
              Your application has been submitted and is being reviewed.
              You'll be notified when there's an update on your application status.
            </AlertDescription>
          </Alert>
        ) : showApplicationRequiredAlert ? (
          <Alert className="mb-8" variant="destructive">
            <AlertTitle>Application Required</AlertTitle>
            <AlertDescription>
              Please complete your application to begin the hiring process.
              All fields are required.
            </AlertDescription>
          </Alert>
        ) : null} {/* No alert if submitted=false AND status is past initial stages */}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Resume Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2" />
                    Resume
                  </CardTitle>
                  <CardDescription>
                    Upload your resume or provide a link to it
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="resume"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col space-y-2">
                          <FormLabel>Resume URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/my-resume.pdf" 
                              {...field} 
                              disabled={isSubmitted}
                            />
                          </FormControl>
                          <FormDescription>
                            Direct link to your resume (PDF preferred)
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="mx-4 text-sm text-gray-500">OR</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <div>
                    <Label htmlFor="resumeUpload">Upload Resume</Label>
                    <div className="mt-2">
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="resumeUpload"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-gray-500" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">PDF, DOCX (MAX. 5MB)</p>
                          </div>
                          <input 
                            id="resumeUpload" 
                            type="file" 
                            className="hidden" 
                            onChange={handleResumeUpload}
                            disabled={isSubmitted}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* About Me Video Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Video className="mr-2" />
                    About Me Video
                  </CardTitle>
                  <CardDescription>
                    Share a video introducing yourself
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="aboutMeVideo"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col space-y-2">
                          <FormLabel>Video URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/about-me-video" 
                              {...field} 
                              disabled={isSubmitted}
                            />
                          </FormControl>
                          <FormDescription>
                            Link to your about me video (YouTube, Vimeo, etc.)
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="mx-4 text-sm text-gray-500">OR</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <div>
                    <Label htmlFor="aboutMeUpload">Upload Video</Label>
                    <div className="mt-2">
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="aboutMeUpload"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-gray-500" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">MP4, MOV, WEBM (MAX. 100MB)</p>
                          </div>
                          <input 
                            id="aboutMeUpload" 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => handleVideoUpload(e, "aboutMe")}
                            disabled={isSubmitted}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sales Pitch Video Section */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Video className="mr-2" />
                    Sales Pitch Video
                  </CardTitle>
                  <CardDescription>
                    Record a short sales pitch demonstrating your skills
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="salesPitchVideo"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col space-y-2">
                          <FormLabel>Video URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/sales-pitch-video" 
                              {...field} 
                              disabled={isSubmitted}
                            />
                          </FormControl>
                          <FormDescription>
                            Link to your sales pitch video (YouTube, Vimeo, etc.)
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="mx-4 text-sm text-gray-500">OR</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <div>
                    <Label htmlFor="salesPitchUpload">Upload Video</Label>
                    <div className="mt-2">
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="salesPitchUpload"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-gray-500" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">MP4, MOV, WEBM (MAX. 100MB)</p>
                          </div>
                          <input 
                            id="salesPitchUpload" 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => handleVideoUpload(e, "salesPitch")}
                            disabled={isSubmitted}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end space-x-4">
              {!isSubmitted ? (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">Edit Application</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Edit Application?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your application has already been submitted and is being reviewed.
                        Are you sure you want to edit it? This may reset your application process.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => setIsSubmitted(false)}>
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
};

export default Application;
