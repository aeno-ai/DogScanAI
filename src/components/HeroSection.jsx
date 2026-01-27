import { Camera, Users, Smartphone } from "lucide-react";
import heroImage from "../assets/hero-dog.jpg"; 

const Hero = () => {
  return (
    <section className="min-h-screen w-full flex items-center justify-center overflow-hidden py-20 md:px-0 max-w-7xl mx-auto">
      <div className="w-full relative z-10 px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-600 font-medium text-sm mb-6">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              Powered by AI • 98.5% Accuracy
            </div>

            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Discover Your Dog's <span className="text-blue-600">True Breed</span> in Seconds
            </h1>

            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0">
              Upload a photo or snap a picture — our AI instantly identifies breeds, compares
              traits, and gives you tailored care tips.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <a
                href="#predict"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                <Camera className="w-5 h-5" />
                Try Live Scan
              </a>
              <a
                href="#gallery"
                className="inline-flex items-center justify-center gap-2 border-2 border-gray-300 bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors"
              >
                <Users className="w-5 h-5" />
                Browse Community
              </a>
            </div>

            <div className="flex flex-col items-center lg:items-start gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Smartphone className="w-4 h-4" />
                Also available in Android
              </div>

              <div className="flex gap-3">
                <button className="h-10 px-4 bg-gray-900 text-white rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity text-sm">
                  Download
                </button>
              
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-blue-200 rounded-xl blur-2xl transform scale-95" />

            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src={heroImage}
                alt="Happy golden retriever ready for breed scanning"
                className="w-full h-auto object-cover"
                style={{ aspectRatio: "4 / 3" }}
              />

              <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-64 bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-gray-300">
                <div className="text-sm font-medium text-gray-900 mb-2">Top Prediction</div>

                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif font-bold text-lg text-gray-900">Golden Retriever</span>
                  <span className="text-blue-600 font-bold">94%</span>
                </div>

                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-blue-600 to-indigo-500 rounded-full"
                    style={{ width: "94%" }}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default Hero;