import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Search,
  Plus,
  MoreHorizontal,
  PenLine,
  Trash2,
  Video,
  FileText,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database, TablesInsert } from "@/integrations/supabase/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Define types from Supabase schema
type Video = Database['public']['Tables']['videos']['Row'];
type TrainingModule = Database['public']['Tables']['training_modules']['Row']; // Assuming this is the quizzes table

const TrainingManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Dialog visibility state
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [showEditVideoDialog, setShowEditVideoDialog] = useState(false);
  const [showEditQuizDialog, setShowEditQuizDialog] = useState(false);

  // Search and Tab state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("videos");

  // Add Video form state
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoDescription, setNewVideoDescription] = useState("");
  const [newVideoModule, setNewVideoModule] = useState("product"); // Renamed and set default
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoDuration, setNewVideoDuration] = useState(""); // Added

  // Add Quiz form state
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizDescription, setNewQuizDescription] = useState("");
  const [newQuizModule, setNewQuizModule] = useState("product"); // Add state for module selection

  // Edit Video state
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState("");
  const [editVideoDescription, setEditVideoDescription] = useState("");
  const [editVideoModule, setEditVideoModule] = useState("product"); // Renamed and set default
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editVideoDuration, setEditVideoDuration] = useState(""); // Added

  // Edit Quiz state
  const [editingQuiz, setEditingQuiz] = useState<TrainingModule | null>(null);
  const [editQuizTitle, setEditQuizTitle] = useState("");
  const [editQuizDescription, setEditQuizDescription] = useState("");
  const [editQuizModule, setEditQuizModule] = useState("product");

  // Fetch Training Videos
  const { 
    data: fetchedVideos,
    isLoading: isLoadingVideos,
    error: videosError
  } = useQuery<Video[]>({
    queryKey: ['trainingVideos'],
    queryFn: async (): Promise<Video[]> => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        toast.error("Failed to fetch videos: " + error.message);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch Training Modules (Quizzes)
  const { 
    data: fetchedModules,
    isLoading: isLoadingModules,
    error: modulesError
  } = useQuery<TrainingModule[]>({
    queryKey: ['trainingModules'],
    queryFn: async (): Promise<TrainingModule[]> => {
      const { data, error } = await supabase
        .from('training_modules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        toast.error("Failed to fetch modules: " + error.message);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user,
  });

  // --- MUTATIONS ---

  // CREATE VIDEO (Corrected module and added duration)
  const createVideoMutation = useMutation({
    // Use correct type excluding read-only fields
    mutationFn: async (newVideoData: Omit<Video, 'id' | 'created_at'>) => { 
      const { data, error } = await supabase
        .from('videos')
        .insert([newVideoData]) // Pass the full object
        .select();
      if (error) throw new Error(error.message);
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingVideos'] });
      toast.success("Training video added successfully");
      setShowVideoDialog(false);
      setNewVideoTitle("");
      setNewVideoDescription("");
      setNewVideoModule("product"); // Reset module
      setNewVideoUrl("");
      setNewVideoDuration(""); // Reset duration
    },
    onError: (error) => {
      toast.error("Failed to add video: " + error.message);
    },
  });

  // CREATE QUIZ (Updated mutationFn type if needed, includes module)
  const createQuizMutation = useMutation({
    mutationFn: async (newQuizData: Omit<TrainingModule, 'id' | 'created_at' | 'updated_at'>) => {
      // Ensure newQuizData includes 'module' which is required by DB
      const { data, error } = await supabase
        .from('training_modules')
        .insert([newQuizData])
        .select();
      if (error) throw new Error(error.message);
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingModules'] });
      toast.success("Training quiz added successfully");
      setShowQuizDialog(false);
      setNewQuizTitle("");
      setNewQuizDescription("");
      setNewQuizModule("product"); // Reset module
    },
    onError: (error) => {
      toast.error("Failed to add quiz: " + error.message);
    },
  });

  // UPDATE VIDEO Mutation (Corrected module and added duration)
  const updateVideoMutation = useMutation({
    // Use correct type 
    mutationFn: async (updatedVideoData: Pick<Video, 'id' | 'title' | 'description' | 'url' | 'module' | 'duration'>) => {
      const { id, ...updateData } = updatedVideoData;
      const { error } = await supabase
        .from('videos')
        .update(updateData) // Pass only fields to update
        .eq('id', id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingVideos'] });
      toast.success("Video updated successfully");
      setShowEditVideoDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to update video: " + error.message);
    },
  });

  // UPDATE QUIZ/MODULE Mutation
  const updateQuizMutation = useMutation({
    mutationFn: async (updatedQuizData: Partial<TrainingModule> & { id: string }) => {
      const { id, ...updateData } = updatedQuizData;
      const { error } = await supabase
        .from('training_modules')
        .update(updateData)
        .eq('id', id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingModules'] });
      toast.success("Quiz/Module updated successfully");
      setShowEditQuizDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to update quiz/module: " + error.message);
    },
  });

  // DELETE mutation (remains the same)
  const deleteContentMutation = useMutation({
    mutationFn: async ({ contentType, id }: { contentType: 'Video' | 'Module', id: string }) => {
      const tableName = contentType === 'Video' ? 'videos' : 'training_modules';
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      }
      return { contentType, id }; // Return info for success message
    },
    onSuccess: ({ contentType }) => {
      // Invalidate the appropriate query cache
      const queryKey = contentType === 'Video' ? ['trainingVideos'] : ['trainingModules'];
      queryClient.invalidateQueries({ queryKey });
      toast.success(`${contentType} deleted successfully`);
    },
    onError: (error, variables) => {
      toast.error(`Failed to delete ${variables.contentType}: ${error.message}`);
    },
  });

  // --- HANDLERS ---

  // CREATE VIDEO HANDLER (Corrected module and added duration)
  const handleAddVideo = () => {
    if (!newVideoTitle || !newVideoModule || !newVideoUrl || !newVideoDuration) { // Added duration check
      toast.error("Title, Module, URL, and Duration are required.");
      return;
    }
    if (!user) { toast.error("You must be logged in."); return; }

    createVideoMutation.mutate({
      title: newVideoTitle,
      description: newVideoDescription || null,
      url: newVideoUrl,
      module: newVideoModule, // Use correct state/column
      duration: newVideoDuration, // Add duration
      created_by: user.id 
    });
  };

  // CREATE QUIZ HANDLER (Explicit type casting)
  const handleAddQuiz = () => {
    if (!newQuizTitle || !newQuizModule) { 
      toast.error("Quiz title and module are required.");
      return;
    }
    if (!user) { toast.error("You must be logged in."); return; }

    // Cast the object to the correct Supabase Insert type
    const quizData: TablesInsert<"training_modules"> = {
      title: newQuizTitle,
      description: newQuizDescription || null,
      module: newQuizModule, 
      created_by: user.id
      // Set optional fields to null or default if necessary by your logic/schema
      // content: null, 
      // quiz_id: null,
      // video_url: null 
    };

    createQuizMutation.mutate(quizData);
  };

  // DELETE HANDLER (remains the same)
  const handleDeleteContent = (contentType: 'Video' | 'Module', id: string) => {
    // Optional: Add a confirmation dialog here before deleting
    if (window.confirm(`Are you sure you want to delete this ${contentType}?`)) {
      deleteContentMutation.mutate({ contentType, id });
    }
  };

  // EDIT VIDEO - Open Dialog & Pre-fill State (Corrected module and added duration)
  const handleEditVideoClick = (video: Video) => {
    setEditingVideo(video);
    setEditVideoTitle(video.title);
    setEditVideoDescription(video.description || "");
    setEditVideoUrl(video.url || "");
    setEditVideoModule(video.module || "product"); // Use correct state/column
    setEditVideoDuration(video.duration || ""); // Add duration
    setShowEditVideoDialog(true);
  };

  // EDIT QUIZ - Open Dialog & Pre-fill State
  const handleEditQuizClick = (quiz: TrainingModule) => {
    setEditingQuiz(quiz);
    setEditQuizTitle(quiz.title);
    setEditQuizDescription(quiz.description || "");
    setEditQuizModule(quiz.module || "product"); // Use existing module or default
    setShowEditQuizDialog(true);
  };

  // UPDATE VIDEO Handler (Corrected module and added duration)
  const handleUpdateVideo = () => {
    if (!editingVideo) return;
    if (!editVideoTitle || !editVideoModule || !editVideoUrl || !editVideoDuration) { // Added duration check
      toast.error("Title, Module, URL, and Duration are required.");
      return;
    }

    updateVideoMutation.mutate({
      id: editingVideo.id,
      title: editVideoTitle,
      description: editVideoDescription || null,
      url: editVideoUrl,
      module: editVideoModule, // Use correct state/column
      duration: editVideoDuration, // Add duration
    });
  };

  // UPDATE QUIZ Handler
  const handleUpdateQuiz = () => {
    if (!editingQuiz) return;
    // TODO: Add validation if needed

    updateQuizMutation.mutate({
      id: editingQuiz.id,
      title: editQuizTitle,
      description: editQuizDescription || null,
      module: editQuizModule,
    });
  };

  const filteredVideos = fetchedVideos?.filter(
    (video) =>
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (video.description && video.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const filteredQuizzes = fetchedModules?.filter(
    (module) =>
      module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (module.description && module.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Training Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage training videos and quizzes for the sales training program
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="videos" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full md:w-[400px]">
            <TabsTrigger value="videos">Training Videos</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          </TabsList>

          {/* Training Videos Tab */}
          <TabsContent value="videos" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Training Videos</h2>
                <p className="text-muted-foreground">Manage training video content for candidates</p>
              </div>
              <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Add New Video
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Add New Training Video</DialogTitle>
                    <DialogDescription>
                      Upload a new training video for candidate education.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Video Title</Label>
                      <Input id="title" placeholder="Enter video title" required 
                             value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" placeholder="Enter video description" required
                                value={newVideoDescription} onChange={(e) => setNewVideoDescription(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="module">Module</Label>
                      <Select value={newVideoModule} onValueChange={setNewVideoModule}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select module" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Product Knowledge</SelectItem>
                          <SelectItem value="sales">Sales Techniques</SelectItem>
                          <SelectItem value="relationship">Relationship Building</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="videoUrl">Video URL</Label>
                      <Input id="videoUrl" placeholder="https://example.com/video" required 
                             value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (e.g., 12:34)</Label>
                      <Input id="duration" placeholder="MM:SS or text" required value={newVideoDuration} onChange={(e) => setNewVideoDuration(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowVideoDialog(false)}>Cancel</Button>
                    <Button type="button" onClick={handleAddVideo} disabled={createVideoMutation.isPending}>
                      {createVideoMutation.isPending ? "Adding..." : "Add Video"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead className="hidden md:table-cell">Duration</TableHead>
                        <TableHead className="hidden md:table-cell">Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingVideos ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">Loading videos...</TableCell>
                        </TableRow>
                      ) : videosError ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-red-600">Error: {videosError.message}</TableCell>
                        </TableRow>
                      ) : filteredVideos.length > 0 ? (
                        filteredVideos.map((video) => (
                          <TableRow key={video.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium flex items-center">
                                  <Video className="h-4 w-4 mr-2 text-primary" />
                                  {video.title}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {video.description || "No description"}
                                </div>
                                {video.url && (
                                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block truncate">{video.url}</a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                video.module === "product" ? "default" 
                                : video.module === "sales" ? "secondary"
                                : video.module === "relationship" ? "outline"
                                : "secondary"
                              }>{video.module || "N/A"}</Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {video.duration || "N/A"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {new Date(video.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Video" onClick={() => handleEditVideoClick(video)}>
                                  <PenLine className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  title="Delete Video"
                                  onClick={() => handleDeleteContent('Video', video.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <p className="text-muted-foreground">{searchTerm ? "No videos found matching search." : "No videos created yet."}</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Edit Video Dialog */}
            <Dialog open={showEditVideoDialog} onOpenChange={setShowEditVideoDialog}>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Edit Training Video</DialogTitle>
                  <DialogDescription>
                    Modify the details of this training video.
                  </DialogDescription>
                </DialogHeader>
                {editingVideo && (
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Video Title</Label>
                      <Input id="edit-title" value={editVideoTitle} onChange={(e) => setEditVideoTitle(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea id="edit-description" value={editVideoDescription} onChange={(e) => setEditVideoDescription(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-module">Module</Label>
                      <Select value={editVideoModule} onValueChange={setEditVideoModule}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select module" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Product Knowledge</SelectItem>
                          <SelectItem value="sales">Sales Techniques</SelectItem>
                          <SelectItem value="relationship">Relationship Building</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-videoUrl">Video URL</Label>
                      <Input id="edit-videoUrl" value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-duration">Duration (e.g., 12:34)</Label>
                      <Input id="edit-duration" value={editVideoDuration} onChange={(e) => setEditVideoDuration(e.target.value)} required />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowEditVideoDialog(false)}>Cancel</Button>
                  <Button type="button" onClick={handleUpdateVideo} disabled={updateVideoMutation.isPending}>
                    {updateVideoMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Training Quizzes</h2>
                <p className="text-muted-foreground">Manage quizzes for training module assessment</p>
              </div>
              <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Add New Quiz
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Add New Training Quiz</DialogTitle>
                    <DialogDescription>
                      Create a new quiz to assess candidate knowledge.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="quizTitle">Quiz Title</Label>
                      <Input id="quizTitle" placeholder="Enter quiz title" required 
                             value={newQuizTitle} onChange={(e) => setNewQuizTitle(e.target.value)}/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quizDescription">Description</Label>
                      <Textarea id="quizDescription" placeholder="Enter quiz description" required 
                                value={newQuizDescription} onChange={(e) => setNewQuizDescription(e.target.value)}/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quizModule">Module</Label>
                      <Select value={newQuizModule} onValueChange={setNewQuizModule}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select module" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Product Knowledge</SelectItem>
                          <SelectItem value="sales">Sales Techniques</SelectItem>
                          <SelectItem value="relationship">Relationship Building</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowQuizDialog(false)}>Cancel</Button>
                    <Button type="button" onClick={handleAddQuiz} disabled={createQuizMutation.isPending}>
                      {createQuizMutation.isPending ? "Adding..." : "Add Quiz"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead className="hidden md:table-cell">Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingModules ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">Loading quizzes...</TableCell>
                        </TableRow>
                      ) : modulesError ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-red-600">Error: {modulesError.message}</TableCell>
                        </TableRow>
                      ) : filteredQuizzes.length > 0 ? (
                        filteredQuizzes.map((module) => (
                          <TableRow key={module.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium flex items-center">
                                  <FileText className="h-4 w-4 mr-2 text-primary" />
                                  {module.title}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {module.description || "No description"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {new Date(module.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Quiz/Module" onClick={() => handleEditQuizClick(module)}>
                                  <PenLine className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  title="Delete Quiz/Module"
                                  onClick={() => handleDeleteContent('Module', module.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">
                            <p className="text-muted-foreground">{searchTerm ? "No quizzes found matching search." : "No quizzes created yet."}</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Edit Quiz Dialog */}
            <Dialog open={showEditQuizDialog} onOpenChange={setShowEditQuizDialog}>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Edit Training Quiz/Module</DialogTitle>
                  <DialogDescription>
                    Modify the details of this training quiz/module.
                  </DialogDescription>
                </DialogHeader>
                {editingQuiz && (
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-quiz-title">Title</Label>
                      <Input id="edit-quiz-title" value={editQuizTitle} onChange={(e) => setEditQuizTitle(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-quiz-description">Description</Label>
                      <Textarea id="edit-quiz-description" value={editQuizDescription} onChange={(e) => setEditQuizDescription(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-quiz-module">Module</Label>
                      <Select value={editQuizModule} onValueChange={setEditQuizModule}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select module" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Product Knowledge</SelectItem>
                          <SelectItem value="sales">Sales Techniques</SelectItem>
                          <SelectItem value="relationship">Relationship Building</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* TODO: Add other fields from training_modules if editable */}
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowEditQuizDialog(false)}>Cancel</Button>
                  <Button type="button" onClick={handleUpdateQuiz} disabled={updateQuizMutation.isPending}>
                    {updateQuizMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default TrainingManagement;
