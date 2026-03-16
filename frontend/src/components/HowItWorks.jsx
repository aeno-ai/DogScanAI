import { Camera, Cpu, FileText, ArrowDown } from "lucide-react";

const steps = [
  {
    icon: Camera,
    step: "01",
    title: "Take a Photo",
    description:
      "Snap a clear photo of your dog using your device's camera or upload an existing image.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI Analysis",
    description:
      "Our advanced AI instantly analyzes your dog's features using deep learning technology.",
  },
  {
    icon: FileText,
    step: "03",
    title: "Get Results",
    description:
      "Receive detailed breed information, health insights, and personalized recommendations.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="relative py-24 bg-slate-950 overflow-hidden">
      {/* Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-blue-600/8 blur-[100px] rounded-full pointer-events-none" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(96,165,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm font-semibold mb-5">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
            Simple Process
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            How <span className="text-blue-400">DogScanAI</span> Works
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Three simple steps to discover everything about your beloved companion.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connecting line desktop */}
          <div className="hidden md:block absolute top-[52px] left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px">
            <div className="w-full h-full bg-gradient-to-r from-blue-500/40 via-blue-400/60 to-blue-500/40" />
            {/* Animated pulse dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          </div>

          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="group relative w-full rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm px-6 py-8 text-center hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden">

                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10">
                  {/* Icon circle */}
                  <div className="relative mx-auto w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-5 group-hover:bg-blue-600/30 group-hover:border-blue-500/60 transition-all shadow-lg shadow-blue-500/10">
                    <step.icon className="w-8 h-8 text-blue-400" />
                    {/* Step number badge */}
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-blue-400">
                      {step.step}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Mobile arrow */}
              {index < steps.length - 1 && (
                <div className="md:hidden flex justify-center my-5">
                  <ArrowDown className="w-5 h-5 text-blue-500/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;