import { Camera, Cpu, FileText, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Camera,
    step: "01",
    title: "Take a Photo",
    description: "Snap a clear photo of your dog using your device's camera or upload an existing image.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI Analysis",
    description: "Our advanced AI instantly analyzes your dog's features using deep learning technology.",
  },
  {
    icon: FileText,
    step: "03",
    title: "Get Results",
    description: "Receive detailed breed information, health insights, and personalized recommendations.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="relative section-pad bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,_rgba(37,99,235,0.08),_transparent_60%)]" />
      <div className="page-container relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 animate-fade-up">
            How <span className="text-primary">DogScanAI</span> Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto animate-fade-up-delayed">
            Three simple steps to discover everything about your beloved companion.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-linear-to-r from-primary/40 via-primary to-primary/40" />

          {steps.map((step, index) => (
            <div key={index} className="relative animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="flex flex-col items-center text-center bg-white/70 border border-slate-200 rounded-3xl px-6 py-8 shadow-sm">
                <div className="relative z-10 mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    <step.icon className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground max-w-xs">
                  {step.description}
                </p>
              </div>

              {index < steps.length - 1 && (
                <div className="md:hidden flex justify-center my-6">
                  <ArrowRight className="w-6 h-6 text-primary rotate-90" />
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
