
import React from "react";
import { ArrowRight, BrainCircuit, SquareCode, MessageSquareMore, DatabaseZap } from "lucide-react";

const AIFeaturesSection = ({ addToRefs }: { addToRefs: (el: HTMLElement | null, index: number) => void }) => {
  const aiFeatures = [
    {
      title: "AI-Powered Candidate Matching",
      description: "Our algorithms analyze candidate profiles against job requirements, identifying the best matches based on skills, experience, and cultural fit.",
      icon: <BrainCircuit className="h-12 w-12 text-purple-500" />,
      color: "bg-gradient-to-br from-purple-100 to-purple-50"
    },
    {
      title: "Smart Skill Assessment",
      description: "Automatically evaluate candidates' skills through tailored assessments that adapt to their responses in real-time.",
      icon: <SquareCode className="h-12 w-12 text-indigo-500" />,
      color: "bg-gradient-to-br from-indigo-100 to-indigo-50"
    },
    {
      title: "Interview Intelligence",
      description: "Generate personalized interview questions and analyze responses to provide data-driven hiring recommendations.",
      icon: <MessageSquareMore className="h-12 w-12 text-blue-500" />,
      color: "bg-gradient-to-br from-blue-100 to-blue-50"
    },
    {
      title: "Predictive Performance Analytics",
      description: "Forecast candidate success potential based on historical data and performance patterns from your top performers.",
      icon: <DatabaseZap className="h-12 w-12 text-emerald-500" />,
      color: "bg-gradient-to-br from-emerald-100 to-emerald-50"
    }
  ];

  return (
    <section 
      ref={(el) => addToRefs(el, 1)} 
      className="py-24 section-fade-in bg-gradient-to-br from-indigo-50 to-white"
    >
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-3 py-1 text-sm font-medium text-purple-800 bg-purple-100 rounded-full mb-4">
            AI-Powered Features
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
            Smart Technology, Smarter Hiring
          </h2>
          <p className="text-xl text-muted-foreground">
            Our advanced AI enhances every aspect of your recruitment process, from candidate matching to performance prediction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {aiFeatures.map((feature, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-xl overflow-hidden group"
            >
              <div className={`p-6 ${feature.color} group-hover:bg-white transition-all duration-300`}>
                <div className="mb-4 transform group-hover:scale-110 transition-all duration-300">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>

              <div className="p-4 border-t border-gray-200">
                <div
                  className="cursor-pointer text-indigo-600 hover:text-indigo-800 transition-all text-sm font-medium flex items-center"
                >
                  Learn more <ArrowRight className="ml-1 h-4 w-4 transition-transform transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AIFeaturesSection;
