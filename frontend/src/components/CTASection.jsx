import { Camera, ArrowRight, CheckCircle } from "lucide-react";

const benefits = [
  "Instant breed identification",
  "Health insights & tips",
  "Works with any dog photo",
  "Free to try, no signup required",
];

const CTASection = () => {
  return (
    <section className="py-24 bg-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Discover Your
            <span className="block text-blue-400 mt-2">Dog&apos;s True Identity?</span>
          </h2>
          
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Discover new insights about your furry companions with DogScanAI, built for pet parents who want to know more.
          </p>

          {/* Benefits list */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-gray-200"
              >
                <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="text-sm md:text-base">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#predict"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              <Camera className="w-5 h-5" />
              Start Scanning Now
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
