
import React from "react";
import { Rocket, Users, CheckCircle } from "lucide-react";

const BusinessImpactSection = ({ addToRefs }: { addToRefs: (el: HTMLElement | null, index: number) => void }) => {
  return (
    <section 
      ref={(el) => addToRefs(el, 4)} 
      className="py-24 section-fade-in bg-white"
    >
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-3 py-1 text-sm font-medium text-indigo-800 bg-indigo-100 rounded-full mb-4">
            Business Impact
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
            Benefits for Your Business
          </h2>
          <p className="text-xl text-muted-foreground">
            Our platform offers tangible improvements to your sales hiring outcomes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-xl p-8 transition-all duration-300 hover:shadow-xl bg-white border border-indigo-100">
            <h3 className="text-xl font-semibold mb-6 text-indigo-600 flex items-center">
              <Rocket className="h-5 w-5 mr-2" /> For Hiring Managers
            </h3>
            <ul className="space-y-4">
              {[
                "AI-powered candidate matching reduces screening time by 60%",
                "Data-driven insights eliminate hiring biases",
                "Predictive analytics forecast candidate success with 85% accuracy",
                "Standardized evaluation criteria ensure consistent assessment",
                "Intelligent interviewing tools generate personalized questions"
              ].map((item, index) => (
                <li key={index} className="flex items-start">
                  <div className="p-1 bg-indigo-100 rounded-full mr-3 flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl p-8 transition-all duration-300 hover:shadow-xl bg-white border border-indigo-100">
            <h3 className="text-xl font-semibold mb-6 text-indigo-600 flex items-center">
              <Users className="h-5 w-5 mr-2" /> For Candidates
            </h3>
            <ul className="space-y-4">
              {[
                "Personalized learning paths adapt to individual strengths",
                "AI-generated feedback provides actionable improvement steps",
                "Interactive assessments that engage rather than evaluate",
                "Real-time progress tracking with performance insights",
                "Skills-based evaluation ensures fair opportunity"
              ].map((item, index) => (
                <li key={index} className="flex items-start">
                  <div className="p-1 bg-indigo-100 rounded-full mr-3 flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BusinessImpactSection;
