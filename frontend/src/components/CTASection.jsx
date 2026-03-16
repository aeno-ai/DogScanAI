import { Camera, CheckCircle } from "lucide-react";

const benefits = [
  "Instant breed identification",
  "Health insights and tips",
  "Works with any dog photo",
  "Free demo with no signup required",
];

const CTASection = () => {
  return (
    <section className="relative py-28 bg-slate-950 overflow-hidden">
      {/* Large center glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(96,165,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="relative max-w-3xl mx-auto text-center">

          {/* Glassy card */}
          <div className="relative rounded-3xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-xl p-10 md:p-16 shadow-2xl overflow-hidden">
            {/* Top shine */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
            {/* Bottom shine */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-600/40 to-transparent" />

            {/* Corner glow accents */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-600/15 blur-2xl rounded-full pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 blur-2xl rounded-full pointer-events-none" />

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
              Ready to Discover Your
              <span className="block text-blue-400 mt-1">Dog&apos;s True Identity?</span>
            </h2>

            <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed">
              Discover new insights about your furry companions with DogScanAI,
              built for pet parents who want to know more.
            </p>

            {/* Benefits */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-slate-300"
                >
                  <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <a
              href="#predict"
              className="group relative inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-10 py-4 rounded-xl font-semibold text-lg overflow-hidden transition-all hover:bg-blue-500 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50"
            >
              {/* shimmer sweep */}
              <span className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-white/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
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