import '../App.css';
import Header from '../components/Navigation';
import Hero from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import HowItWorksSection from '../components/HowItWorks';
import GallerySection from '../components/GallerySection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';

import { Navigate } from 'react-router-dom';

function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
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
