
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const CtaSection = ({ addToRefs }: { addToRefs: (el: HTMLElement | null, index: number) => void }) => {
  return (
    <section 
      ref={(el) => addToRefs(el, 5)} 
      className="py-20 section-fade-in bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
    >
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Ready to Transform Your Sales Hiring?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join the next generation of smart recruitment platforms and start hiring top sales talent today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg" variant="secondary" className="rounded-md px-8 py-6 text-lg bg-white text-indigo-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all">
              <Link to="/register">Get Started Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-md px-8 py-6 text-lg border-white text-white hover:bg-white/10">
              <Link to="/login">Schedule a Demo</Link>
            </Button>
          </div>
          <p className="mt-8 text-white/70 text-sm">
            No credit card required • Free 14-day trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
