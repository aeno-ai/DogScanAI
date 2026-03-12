import { Camera, CheckCircle } from "lucide-react";

const benefits = [
  "Instant breed identification",
  "Health insights and tips",
  "Works with any dog photo",
  "Free demo with no signup required",
];

const CTASection = () => {
  return (
    <section className="section-pad bg-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/25 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_60%)]" />

      <div className="page-container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 animate-fade-up">
            Ready to Discover Your
            <span className="block text-blue-400 mt-2">Dog&apos;s True Identity?</span>
          </h2>

          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto animate-fade-up-delayed">
            Discover new insights about your furry companions with DogScanAI, built for pet parents who want to know more.
          </p>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10 animate-fade-up-delayed-2">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-slate-200"
              >
                <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="text-sm md:text-base">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#predict"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
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
