import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import NotFoundDog from '../assets/not-found-dog.png';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center max-w-lg">
        <div className="mb-6 flex justify-center">
            <img src={NotFoundDog} alt="" />
        </div>

        <h1 className="text-7xl font-extrabold text-primary mb-2">404</h1>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Ruh-Roh! Page Not Found
        </h2>
        <p className="text-lg text-muted-foreground mb-2">
          Looks like this page ran away like a puppy off its leash!
        </p>
        <p className="text-muted-foreground mb-8">
          The page <code className="bg-muted px-2 py-1 rounded text-sm font-mono text-foreground">{location.pathname}</code> doesn't exist.
        </p>

        {/* Sad dog card */}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-xl font-semibold text-lg transition-colors"
          >
            <Home size={20} />
            Take Me Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 border border-border bg-card text-foreground hover:bg-accent px-6 py-3 rounded-xl font-semibold text-lg transition-colors"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;