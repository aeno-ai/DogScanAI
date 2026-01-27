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
    <section id="gallery" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            See <span className="text-blue-600">DogScanAI</span> in Action
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Real examples of our AI-powered breed identification and analysis.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {galleryItems.map((item, index) => (
            <div
              key={index}
              className="group relative rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {/* Image */}
              <div className="aspect-square overflow-hidden">
                <img
                  src={item.image}
                  alt={`${item.breed} scan result`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-gray-900/90 via-transparent to-transparent" />

              {/* Confidence Badge - Custom replacement for Badge component */}
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-white/90 text-gray-900 backdrop-blur-sm">
                  {item.confidence} Match
                </span>
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                  {item.breed}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {item.traits.map((trait, traitIndex) => (
                    <span
                      key={traitIndex}
                      className="text-xs px-2 py-1 rounded-full bg-blue-600/80 text-white"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Scanning effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="absolute inset-0 bg-blue-600/10" />
                <div className="absolute left-0 right-0 h-1 bg-blue-600/50 animate-pulse top-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GallerySection;
