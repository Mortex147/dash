
import React from "react";
import { Users, Lightbulb, Target, Star } from "lucide-react";

const HiringProcessSection = ({ addToRefs }: { addToRefs: (el: HTMLElement | null, index: number) => void }) => {
  const steps = [
    {
      number: "01",
      title: "Application & Screening",
      description: "Collect basic information, video pitches, and assess baseline knowledge through AI-powered analysis.",
      isPrimary: true,
      image: "https://images.unsplash.com/photo-1560264418-c4445382edbc?auto=format&fit=crop&w=800&q=80",
      icon: <Users className="h-6 w-6" />
    },
    {
      number: "02",
      title: "Training & Quizzes",
      description: "Provide intelligent training modules that adapt to individual learning patterns.",
      isPrimary: false,
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
      icon: <Lightbulb className="h-6 w-6" />
    },
    {
      number: "03",
      title: "Live Sales Task",
      description: "Evaluate real-world performance with AI-assisted feedback and coaching.",
      isPrimary: false,
      image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=80",
      icon: <Target className="h-6 w-6" />
    },
    {
      number: "04",
      title: "Final Interview & Hiring",
      description: "Data-driven decisions based on comprehensive performance analytics.",
      isPrimary: false,
      image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80",
      icon: <Star className="h-6 w-6" />
    }
  ];

  return (
    <section 
      ref={(el) => addToRefs(el, 2)} 
      className="py-24 section-fade-in bg-white"
    >
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-3 py-1 text-sm font-medium text-indigo-800 bg-indigo-100 rounded-full mb-4">
            Interactive Platform
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
            A Data-Driven Hiring Process
          </h2>
          <p className="text-xl text-muted-foreground">
            Our four-step approach evaluates candidates on both knowledge and practical skills through an engaging journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`rounded-xl transition-all duration-300 hover:shadow-xl overflow-hidden ${
                step.isPrimary
                  ? "border-2 border-indigo-500"
                  : "border border-gray-200"
              }`}
            >
              <div className="relative h-48 w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2">
                  <div className={`rounded-full p-2 ${step.isPrimary ? "bg-indigo-600" : "bg-white"}`}>
                    <div className={step.isPrimary ? "text-white" : "text-indigo-600"}>
                      {step.icon}
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${step.isPrimary ? "text-white" : "text-white"}`}>
                    {step.number}
                  </div>
                </div>
                <img 
                  src={step.image}
                  alt={`Step ${index + 1}: ${step.title}`} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://images.unsplash.com/photo-156010291${index + 1}555-e07d5${index + 1}c4d4a?auto=format&fit=crop&w=800&q=60`;
                  }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HiringProcessSection;
