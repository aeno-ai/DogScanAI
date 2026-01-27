import { Dog } from "lucide-react";

/**
 * Loading Component
 * 
 * Usage:
 * 1. Full page loading: <Loading />
 * 2. Small inline spinner: <Loading size="sm" />
 * 3. With custom message: <Loading message="Analyzing breed..." />
 * 4. Overlay on existing content: <Loading overlay />
 */

const Loading = ({ 
  size = "default", 
  message = "Loading...", 
  overlay = false 
}) => {
  // Size variants
  const sizes = {
    sm: {
      container: "p-4",
      icon: "w-6 h-6",
      spinner: "w-8 h-8",
      text: "text-sm",
    },
    default: {
      container: "p-8",
      icon: "w-10 h-10",
      spinner: "w-16 h-16",
      text: "text-base",
    },
    lg: {
      container: "p-12",
      icon: "w-14 h-14",
      spinner: "w-24 h-24",
      text: "text-lg",
    },
  };

  const currentSize = sizes[size] || sizes.default;

  const content = (
    <div className={`flex flex-col items-center justify-center gap-4 ${currentSize.container}`}>
      {/* Animated spinner with dog icon */}
      <div className="relative">
        {/* Spinning ring */}
        <div 
          className={`${currentSize.spinner} border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin`}
        />
        {/* Dog icon in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Dog className={`${currentSize.icon} text-blue-600 animate-pulse`} />
        </div>
      </div>
      
      {/* Loading message */}
      {message && (
        <p className={`${currentSize.text} text-gray-600 font-medium animate-pulse`}>
          {message}
        </p>
      )}
    </div>
  );

  // Full page overlay version
  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  // Full page version (default)
  if (size === "default" || size === "lg") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {content}
      </div>
    );
  }

  // Inline version (sm)
  return content;
};

export default Loading;
