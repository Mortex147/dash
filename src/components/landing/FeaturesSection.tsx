
import React from "react";
import { Rocket, Lightbulb, Target } from "lucide-react";

const FeaturesSection = ({ addToRefs }: { addToRefs: (el: HTMLElement | null, index: number) => void }) => {
  const features = [
    {
      title: "Structured Hiring Journey",
      description: "Guide candidates through a defined 4-step hiring process that evaluates skills at each stage.",
      icon: <Rocket className="h-12 w-12 text-primary" />,
      color: "bg-gradient-to-br from-violet-100 to-violet-50"
    },
    {
      title: "Comprehensive Training",
      description: "Deliver product knowledge, sales techniques, and relationship-building strategies through engaging modules.",
      icon: <Lightbulb className="h-12 w-12 text-primary" />,
      color: "bg-gradient-to-br from-blue-100 to-blue-50"
    },
    {
      title: "Performance Evaluation",
      description: "Assess real-world performance through practical sales tasks with outcome-based rewards.",
      icon: <Target className="h-12 w-12 text-primary" />,
      color: "bg-gradient-to-br from-emerald-100 to-emerald-50"
    }
  ];

  return (
    <section 
      ref={(el) => addToRefs(el, 0)} 
      className="py-24 section-fade-in bg-white"
    >
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-3 py-1 text-sm font-medium text-indigo-800 bg-indigo-100 rounded-full mb-4">
            The Future of Sales Hiring
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
            Comprehensive Sales Hiring Platform
          </h2>
          <p className="text-xl text-muted-foreground">
            Our platform offers everything you need to identify, train, and retain top sales talent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`rounded-xl p-8 transition-all duration-300 hover:shadow-xl ${feature.color} hover:-translate-y-1 cursor-pointer`}
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
