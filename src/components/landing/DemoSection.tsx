
import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";

const DemoSection = ({ addToRefs }: { addToRefs: (el: HTMLElement | null, index: number) => void }) => {
  const [activeDemo, setActiveDemo] = useState(0);
  const [progress, setProgress] = useState(0);

  // Progress bar animation
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        const newProgress = prevProgress + 1;
        if (newProgress >= 100) {
          clearInterval(timer);
          return 100;
        }
        return newProgress;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [activeDemo]); // Reset progress when active demo changes

  const demoScreens = [
    {
      title: "AI-Powered Candidate Dashboard",
      description: "Real-time performance tracking with AI-generated recommendations and personalized growth paths.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1470&q=80"
    },
    {
      title: "Smart Assessment Engine",
      description: "Adaptive questioning that adjusts difficulty based on candidate responses and provides instant feedback.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1470&q=80"
    },
    {
      title: "Performance Analytics",
      description: "Comprehensive metrics and predictive insights help identify top performers early in the process.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1470&q=80"
    }
  ];

  return (
    <section
      ref={(el) => addToRefs(el, 3)}
      className="py-24 section-fade-in bg-gradient-to-br from-purple-50 to-white"
    >
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-3 py-1 text-sm font-medium text-purple-800 bg-purple-100 rounded-full mb-4">
            Interactive Demo
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
            See Our Platform in Action
          </h2>
          <p className="text-xl text-muted-foreground">
            Experience how our AI-powered tools transform the hiring process from start to finish
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {demoScreens.map((demo, index) => (
              <div
                key={index}
                className={`p-6 rounded-xl cursor-pointer transition-all ${
                  activeDemo === index
                    ? "bg-white shadow-lg border-2 border-indigo-500 transform scale-105"
                    : "bg-white/50 hover:bg-white border border-gray-200"
                }`}
                onClick={() => {
                  setActiveDemo(index);
                  setProgress(0); // Reset progress when switching
                }}
              >
                <h3 className={`text-lg font-semibold mb-2 ${
                  activeDemo === index ? "text-indigo-600" : "text-gray-800"
                }`}>
                  {demo.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {demo.description}
                </p>
              </div>
            ))}
          </div>
          
          <div className="lg:col-span-3 bg-white p-4 rounded-xl shadow-xl border border-gray-200">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-r from-indigo-600 to-purple-500 rounded-t-lg flex items-center px-4">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="ml-4 text-xs text-white font-medium">
                  {demoScreens[activeDemo].title}
                </div>
              </div>
              <div className="mt-8 p-4">
                <img
                  src={demoScreens[activeDemo].image}
                  alt={demoScreens[activeDemo].title}
                  className="w-full h-full object-cover rounded-md shadow-md"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://images.unsplash.com/photo-15560${activeDemo + 1}0120998-a94e0eb934c0?auto=format&fit=crop&w=800&q=60`;
                  }}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-white text-xs">
                    <span>Processing candidate data</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
