import { Brain, Heart, Shield, Zap, SmilePlus, Clock, MessageSquare, Stethoscope, History, Lock } from "lucide-react";

const publicFeatures = [
  {
    icon: Brain,
    title: "Breed Identification",
    description: "Instantly identify over 121 dog breeds with our advanced AI recognition technology.",
  },
  {
    icon: Heart,
    title: "Health Insights",
    description: "Get breed-specific health information and potential genetic conditions to watch for.",
  },
  {
    icon: Shield,
    title: "Safety Tips",
    description: "Receive personalized safety recommendations based on your dog's breed characteristics.",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get accurate results in seconds. No waiting, no complicated processes.",
  },
  {
    icon: SmilePlus,
title: "Emotion Detector",
description: "Reads your dog's facial expressions so you finally know if they're excited to see you — or just excited about dinner."
  },
  {
    icon: Clock,
    title: "Age Estimation",
    description: "Our AI can estimate your dog's age based on physical characteristics.",
  },
];

const premiumFeatures = [
  {
    icon: MessageSquare,
    title: "AI Assistant",
    description: "Chat with our AI for personalized advice, training tips, and breed-specific guidance anytime.",
    color: "from-blue-600/20 to-blue-500/5",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/10",
  },
  {
    icon: Stethoscope,
    title: "Disease Scanner",
    description: "Advanced health diagnostics powered by AI to detect potential illness and conditions early.",
    color: "from-cyan-600/20 to-cyan-500/5",
    border: "border-cyan-500/30",
    glow: "shadow-cyan-500/10",
  },
  {
    icon: History,
    title: "Scan History",
    description: "Access all your previous scans, track changes over time, and build a full health log.",
    color: "from-indigo-600/20 to-indigo-500/5",
    border: "border-indigo-500/30",
    glow: "shadow-indigo-500/10",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="relative py-24 bg-slate-950 overflow-hidden">
      {/* Background */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-blue-600/8 blur-[120px] rounded-full pointer-events-none" />
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
            <Zap className="w-3.5 h-3.5" />
            Built for Pet Parents
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Powerful Features for{" "}
            <span className="text-blue-400">Pet Parents</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Everything you need to understand your furry friend better, all powered by
            cutting-edge artificial intelligence.
          </p>
        </div>

        {/* Public feature grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
          {publicFeatures.map((feature, index) => (
            <div
              key={index}
              className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 transition-all">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Premium / Locked features */}
        <div className="relative">
          {/* Section divider */}
          <div className="flex items-center gap-4 mb-10">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-800" />
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/30 bg-yellow-500/8 text-yellow-400 text-sm font-semibold">
              <Lock className="w-3.5 h-3.5" />
              Login to Unlock
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-800" />
          </div>

          <p className="text-center text-slate-500 text-sm mb-8 max-w-md mx-auto">
            These advanced features are available exclusively to registered users. Create a free account to get full access.
          </p>

          <div className="grid md:grid-cols-3 gap-5">
            {premiumFeatures.map((feature, index) => (
              <div
                key={index}
                className={`group relative rounded-2xl border ${feature.border} bg-gradient-to-br ${feature.color} backdrop-blur-sm p-6 shadow-xl ${feature.glow} overflow-hidden transition-all duration-300 hover:-translate-y-1`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Lock badge */}
                <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-900/80 border border-slate-700 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Top shine line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white/80" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 text-center">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40"
            >
              <Lock className="w-4 h-4" />
              Log in to unlock all features
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;