import dogScan1 from "../assets/dog-scan-1.jpg";
import dogScan2 from "../assets/dog-scan-2.jpg";
import dogScan3 from "../assets/dog-scan-3.jpg";

const galleryItems = [
  {
    image: dogScan1,
    breed: "Chihuahua",
    confidence: "92.21%",
    traits: ["Loyal", "Alert", "Bold"],
  },
  {
    image: dogScan2,
    breed: "Siberian Husky",
    confidence: "99%",
    traits: ["Energetic", "Loyal", "Independent"],
  },
  {
    image: dogScan3,
    breed: "Mixed Breed",
    confidence: "95%",
    traits: ["Friendly", "Active", "Intelligent"],
  },
];

const GallerySection = () => {
  return (
    <section id="gallery" className="relative py-24 bg-slate-950 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-blue-600/6 blur-[130px] rounded-full pointer-events-none" />

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
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Real Scan Results
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            See <span className="text-blue-400">DogScanAI</span> in Action
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Real examples of our AI-powered breed identification and analysis.
          </p>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {galleryItems.map((item, index) => (
            <div
              key={index}
              className="group relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-1 shadow-xl hover:shadow-blue-900/20"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="aspect-square overflow-hidden relative">
                <img
                  src={item.image}
                  alt={`${item.breed} scan result`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Scan overlay on hover */}
                <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Scan sweep */}
                <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/60 to-transparent animate-scanline" />
                </div>

                {/* Corner brackets */}
                <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-blue-400/0 group-hover:border-blue-400/80 rounded-tl-sm transition-all duration-300" />
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-blue-400/0 group-hover:border-blue-400/80 rounded-tr-sm transition-all duration-300" />
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-blue-400/0 group-hover:border-blue-400/80 rounded-bl-sm transition-all duration-300" />
                <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-blue-400/0 group-hover:border-blue-400/80 rounded-br-sm transition-all duration-300" />
              </div>

              {/* Bottom gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/20 to-transparent pointer-events-none" />

              {/* Confidence badge */}
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900/90 border border-slate-700/80 text-white backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  {item.confidence}
                </span>
              </div>

              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-lg font-bold text-white mb-2">
                  {item.breed}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {item.traits.map((trait, traitIndex) => (
                    <span
                      key={traitIndex}
                      className="text-xs px-2 py-0.5 rounded-full bg-blue-600/30 border border-blue-500/30 text-blue-300"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .animate-scanline {
          animation: scanline 2s linear infinite;
          position: absolute;
        }
      `}</style>
    </section>
  );
};

export default GallerySection;