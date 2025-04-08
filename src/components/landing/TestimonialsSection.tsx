
import React from "react";
import { Star } from "lucide-react";

const TestimonialsSection = ({ addToRefs }: { addToRefs: (el: HTMLElement | null, index: number) => void }) => {
  const testimonials = [
    {
      quote: "We've cut our time-to-hire by 60% and found higher quality candidates who stay longer with our company.",
      author: "Sarah Johnson",
      position: "VP of Sales, TechCorp",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      quote: "The AI-powered candidate matching has completely transformed how we find the right sales talent for our team.",
      author: "Michael Chen",
      position: "Sales Director, GrowthStack",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
      quote: "We've seen a 40% improvement in sales performance from new hires that went through this platform.",
      author: "Priya Patel",
      position: "Chief Revenue Officer, SalesPro",
      avatar: "https://randomuser.me/api/portraits/women/68.jpg"
    }
  ];

  return (
    <section 
      ref={(el) => addToRefs(el, 6)} 
      className="py-24 section-fade-in bg-gradient-to-br from-indigo-50 to-white"
    >
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-3 py-1 text-sm font-medium text-indigo-800 bg-indigo-100 rounded-full mb-4">
            Client Success Stories
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
            What Our Customers Say
          </h2>
          <p className="text-xl text-muted-foreground">
            Don't just take our word for it – hear from the companies that have transformed their sales hiring
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-lg text-gray-700 italic mb-6">"{testimonial.quote}"</p>
              <div className="flex items-center">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.author}
                  className="h-12 w-12 rounded-full mr-4 border-2 border-indigo-100"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${testimonial.author.replace(' ', '+')}&background=6366f1&color=fff`;
                  }}
                />
                <div>
                  <h4 className="font-semibold text-gray-900">{testimonial.author}</h4>
                  <p className="text-sm text-gray-500">{testimonial.position}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
