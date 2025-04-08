import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Application from "./pages/candidate/Application";
import CandidateDashboard from "./pages/dashboard/CandidateDashboard";
import ManagerDashboard from "./pages/dashboard/ManagerDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import DirectorDashboard from "./pages/dashboard/DirectorDashboard";
import Training from "./pages/training/Training";
import Quiz from "./pages/training/Quiz";
import AssessmentQuiz from "./pages/training/AssessmentQuiz";
import VideoPlayer from "./pages/training/VideoPlayer";
import Candidates from "./pages/manager/Candidates";
import CandidateDetail from "./pages/manager/CandidateDetail";
import Assessments from "./pages/manager/Assessments";
import Analytics from "./pages/manager/Analytics";
import Profile from "./pages/common/Profile";
import UserManagement from "./pages/admin/UserManagement";
import ActivityLog from "./pages/admin/ActivityLog";
import TrainingManagement from "./pages/admin/TrainingManagement";
import AssessmentDetails from "./pages/admin/AssessmentDetails";
import AssessmentResultDetails from "./pages/admin/AssessmentResultDetails";
import AssessmentSectionDetails from "./pages/admin/AssessmentSectionDetails";
import TrainingModuleDetails from "./pages/admin/TrainingModuleDetails";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/application" element={<Application />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard/candidate" element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <CandidateDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/manager" element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerDashboard role="Manager"/>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/director" element={
              <ProtectedRoute allowedRoles={['director']}>
                <DirectorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/hr" element={
              <ProtectedRoute allowedRoles={['hr']}>
                <ManagerDashboard role="Hr"/>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/training" element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <Training />
              </ProtectedRoute>
            } />
            <Route path="/training/quiz/:moduleId" element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <Quiz />
              </ProtectedRoute>
            } />
            <Route path="/training/assessment/:assessmentId" element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <AssessmentQuiz />
              </ProtectedRoute>
            } />
            <Route path="/training/video/:moduleId/:videoId" element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <VideoPlayer />
              </ProtectedRoute>
            } />
            
            {/* Manager Routes */}
            <Route path="/candidates" element={
              <ProtectedRoute allowedRoles={['manager', 'admin', 'hr', 'director']}>
                <Candidates />
              </ProtectedRoute>
            } />
            <Route path="/candidates/:id" element={
              <ProtectedRoute allowedRoles={['manager', 'admin', 'hr', 'director']}>
                <CandidateDetail />
              </ProtectedRoute>
            } />
            <Route path="/assessments" element={
              <ProtectedRoute allowedRoles={['manager', 'admin', 'hr', 'director']}>
                <Assessments />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute allowedRoles={['manager', 'admin', 'hr', 'director']}>
                <Analytics />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/activity-log" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ActivityLog />
              </ProtectedRoute>
            } />
            <Route path="/training-management" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TrainingManagement />
              </ProtectedRoute>
            } />
            
            {/* Assessment and Training Module Detail Routes */}
            <Route path="/assessments/:assessmentId" element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'director']}>
                <AssessmentDetails />
              </ProtectedRoute>
            } />
            <Route path="/assessments/results/:resultId" element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'director']}>
                <AssessmentResultDetails />
              </ProtectedRoute>
            } />
            <Route path="/assessments/sections/:sectionId" element={
              <ProtectedRoute allowedRoles={['admin', 'hr', 'director']}>
                <AssessmentSectionDetails />
              </ProtectedRoute>
            } />
            <Route path="/training-management/:moduleId" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TrainingModuleDetails />
              </ProtectedRoute>
            } />

            {/* Common Routes */}
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['candidate', 'manager', 'admin', 'hr', 'director']}>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
