import './App.css';
import Header from './components/Navigation';
import Hero from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorksSection from './components/HowItWorks';
import GallerySection from './components/GallerySection';
import CTASection from './components/CTASection';
import Footer from './components/Footer';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <ToastProvider>
      <Header />
      <main>
        <Hero />
        <FeaturesSection />
        <HowItWorksSection />
        <GallerySection />
        <CTASection />
      </main>
      <Footer />
    </ToastProvider>
  );
}

export default App;
