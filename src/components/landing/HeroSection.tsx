
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Users, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(path);
  };

  const renderAuthButtons = () => {
    if (user) {
      let dashboardPath = '/dashboard/candidate';
      if (profile?.role === 'admin') {
        dashboardPath = '/dashboard/admin';
      } else if (profile?.role === 'manager') {
        dashboardPath = '/dashboard/manager';
      }
      
      return (
        <Button 
          size="lg" 
          className="rounded-md px-8 py-6 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
          onClick={handleNavigation(dashboardPath)}
        >
          Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      );
    }
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <Button 
          size="lg" 
          className="rounded-md px-8 py-6 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
          onClick={handleNavigation('/register')}
        >
          Try For Free <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <Button 
          variant="outline" 
          size="lg" 
          className="rounded-md px-8 py-6 text-lg border-indigo-200 hover:border-indigo-300 shadow-sm hover:shadow transition-all"
          onClick={handleNavigation('/login')}
        >
          Sign In
        </Button>
      </div>
    );
  };

  const stats = [
    { value: "45%", label: "Higher retention rates", icon: <Users className="h-5 w-5 text-indigo-600" /> },
    { value: "3.2x", label: "ROI on hiring investment", icon: <BarChart3 className="h-5 w-5 text-indigo-600" /> },
    { value: "62%", label: "Faster time-to-productivity", icon: <Zap className="h-5 w-5 text-indigo-600" /> }
  ];

  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-indigo-50 via-purple-50 to-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-white opacity-30"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple-200 filter blur-3xl opacity-60"></div>
        <div className="absolute top-1/2 -left-24 w-80 h-80 rounded-full bg-indigo-200 filter blur-3xl opacity-50"></div>
      </div>
      
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto relative">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl mb-6 animate-fade-in">
            <span className="block">AI-Powered</span>
            <span className="block text-gradient bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Sales Talent Platform</span>
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Revolutionize your sales recruitment process with our AI-driven platform that helps you 
            identify, train, and retain top sales performers with unprecedented accuracy.
          </p>
          <div className="mt-10">
            {renderAuthButtons()}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-20 bg-white rounded-xl shadow-xl animate-slide-up overflow-hidden" style={{ animationDelay: "0.3s" }}>
        <div className="grid grid-cols-1 md:grid-cols-3">
          {stats.map((stat, i) => (
            <div key={i} className={`p-8 flex items-center ${i !== stats.length - 1 ? 'md:border-r border-gray-100' : ''} ${i !== 0 ? 'border-t md:border-t-0' : ''}`}>
              <div className="p-3 rounded-full bg-indigo-50 mr-4">
                {stat.icon}
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-600">{stat.value}</p>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-24 animate-slide-up" style={{ animationDelay: "0.4s" }}>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <div className="relative aspect-video">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/40 to-purple-500/40 flex items-center justify-center z-10">
                <div className="text-center p-6">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg hover:scale-110 transition-transform cursor-pointer">
                    <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                      <ArrowRight className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-white drop-shadow-md">
                    See the platform in action
                  </h3>
                </div>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80" 
                alt="Sales team in action" 
                className="w-full h-full object-cover brightness-75"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80";
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
