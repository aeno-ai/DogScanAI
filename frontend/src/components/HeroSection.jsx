import { Camera, Users, Smartphone } from "lucide-react";
import heroImage from "../assets/hero-dog.jpg";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-blue-50/60 to-slate-50">
      <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-blue-200/60 blur-3xl animate-pulse-glow" />
      <div className="absolute -bottom-24 left-0 h-96 w-96 rounded-full bg-blue-300/40 blur-3xl animate-pulse-glow" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_55%)]" />

      <div className="page-container pt-28 md:pt-32 pb-20 relative z-10">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/80 text-blue-700 font-semibold text-sm mb-6 animate-fade-up">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
              Powered by AI | 98.5% Accuracy
            </div>

            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6 animate-fade-up-delayed">
              Discover Your Dog&apos;s <span className="text-blue-600">True Breed</span> in Seconds
            </h1>

            <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-xl mx-auto lg:mx-0 animate-fade-up-delayed-2">
              Upload a photo or snap a picture - our AI instantly identifies breeds, compares
              traits, and gives you tailored care tips.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <a
                href="#predict"
                className="scroll-smooth inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200/60"
              >
                <Camera className="w-5 h-5" />
                Try Live Scan
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-blue-200 bg-white/80 text-blue-700 font-semibold text-lg hover:border-blue-300 hover:text-blue-800 transition-colors"
              >
                See How It Works
              </a>
            </div>

            <div className="flex flex-col items-center lg:items-start gap-4">
              <div className="inline-flex items-center gap-2 text-sm text-slate-600 bg-white/70 border border-slate-200 px-3 py-2 rounded-full">
                <Smartphone className="w-4 h-4 text-blue-600" />
                Also available in Android
              </div>

              <div className="flex gap-3">
                <button className="h-11 px-5 bg-slate-900 text-white rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity text-sm font-semibold shadow-md">
                  Download
                </button>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
              {[
                { label: "Breeds indexed", value: "350+" },
                { label: "Avg scan time", value: "Seconds" },
                { label: "Care insights", value: "Tailored" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm px-4 py-3 shadow-sm"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                  <p className="text-lg font-semibold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-up-delayed">
            <div className="absolute inset-0 bg-blue-200/70 rounded-[32px] blur-3xl transform scale-95" />

            <div className="relative rounded-[32px] overflow-hidden shadow-2xl border border-white/70 animate-float">
              <img
                src={heroImage}
                alt="Happy golden retriever ready for breed scanning"
                className="w-full h-auto object-cover"
                style={{ aspectRatio: "4 / 3" }}
              />

              <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-5 md:w-64 bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-lg">
                <div className="text-sm font-medium text-slate-700 mb-2">Top Prediction</div>

                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif font-bold text-lg text-slate-900">Golden Retriever</span>
                  <span className="text-blue-600 font-bold">94%</span>
                </div>

                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-blue-600 to-blue-500 rounded-full"
                    style={{ width: "94%" }}
                  />
                </div>
              </div>

              <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-blue-500/20 blur-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
