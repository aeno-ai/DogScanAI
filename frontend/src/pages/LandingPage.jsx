import "../App.css";
import Header from "../components/Navigation";
import Hero from "../components/HeroSection";
import PublicScanSection from "../components/PublicScanSection";
import FeaturesSection from "../components/FeaturesSection";
import HowItWorksSection from "../components/HowItWorks";
import GallerySection from "../components/GallerySection";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";

function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <PublicScanSection />
        <FeaturesSection />
        <HowItWorksSection />
        <GallerySection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}

export default LandingPage;
