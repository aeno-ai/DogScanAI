import { Brain, Heart, Shield, Zap, Dna, Clock } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Breed Identification",
    description: "Instantly identify over 350 dog breeds with our advanced AI recognition technology.",
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
    icon: Dna,
    title: "Mixed Breed Analysis",
    description: "Find out if the scanned dog may be a mixed breed.",
  },
  {
    icon: Clock,
    title: "Age Estimation",
    description: "Our AI can estimate your dog's age based on physical characteristics.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Powerful Features for
            <span className="text-blue-600"> Pet Parents</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Everything you need to understand your furry friend better, all powered by 
            cutting-edge artificial intelligence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group bg-white rounded-2xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-5 group-hover:bg-blue-100 transition-colors">
                <feature.icon className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
