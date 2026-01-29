"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const handleHippoClick = () => {
    setClickCount(prev => prev + 1);
    
    // Add a little animation effect
    setTimeout(() => {
      router.push("/");
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background patterns */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-600 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-600 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-600 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-emerald-800 mb-4 tracking-tight">
            HIPPOCRATIC
          </h1>
          <p className="text-xl sm:text-2xl text-emerald-700 font-medium">
            Spot the Fraud Before It Fattens
          </p>
        </div>

        {/* Logo - Clickable Hippo */}
        <div className="flex justify-center mb-12">
          <button
            onClick={handleHippoClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative group cursor-pointer transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-500 rounded-full"
            style={{
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              filter: isHovered ? 'drop-shadow(0 20px 40px rgba(16, 185, 129, 0.4))' : 'drop-shadow(0 10px 20px rgba(16, 185, 129, 0.2))'
            }}
          >
            {/* Pulsing ring animation */}
            <div className={`absolute inset-0 rounded-full bg-emerald-500 opacity-20 ${isHovered ? 'animate-ping' : ''}`} />
            
            {/* Logo image */}
            <div className="relative">
              <img
                src="/logo2.jpg"
                alt="Hippocratic Logo - Click to explore"
                className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 object-contain rounded-full transition-all duration-300"
                style={{
                  filter: isHovered ? 'brightness(1.1) contrast(1.1)' : 'brightness(1)',
                }}
              />
              
              {/* Click me indicator */}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <div className="bg-emerald-600/95 backdrop-blur-sm text-white px-8 py-4 rounded-full font-bold text-xl shadow-2xl transform transition-transform duration-300 hover:scale-110">
                  🔍 Click Me!
                </div>
              </div>

              {/* Animated sparkles on hover */}
              {isHovered && (
                <>
                  <div className="absolute top-10 right-10 text-3xl animate-bounce">✨</div>
                  <div className="absolute bottom-10 left-10 text-3xl animate-bounce delay-100">💰</div>
                  <div className="absolute top-1/2 right-5 text-2xl animate-pulse">🚨</div>
                  <div className="absolute top-1/2 left-5 text-2xl animate-pulse delay-200">📊</div>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Subtitle with animation */}
        <div className="text-center mb-8">
          <p className="text-emerald-700 text-lg sm:text-xl font-medium animate-pulse">
            👆 Click the hippo to start exploring
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/about"
            className="px-8 py-4 bg-white text-emerald-700 font-semibold rounded-full shadow-lg hover:shadow-xl hover:bg-emerald-50 transition-all duration-300 transform hover:scale-105 border-2 border-emerald-200 flex items-center gap-2"
          >
            <span>ℹ️</span>
            <span>Learn More</span>
          </Link>

          <Link
            href="/"
            className="px-8 py-4 bg-emerald-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:bg-emerald-700 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
          >
            <span>🗺️</span>
            <span>View Map</span>
          </Link>

          <Link
            href="/financials"
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
          >
            <span>💰</span>
            <span>Follow the Money</span>
          </Link>
        </div>

        {/* Stats or features */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-emerald-100">
            <div className="text-4xl mb-2">🏥</div>
            <div className="text-2xl font-bold text-emerald-800">15,743</div>
            <div className="text-emerald-600 font-medium">Healthcare Facilities</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-emerald-100">
            <div className="text-4xl mb-2">💵</div>
            <div className="text-2xl font-bold text-emerald-800">$624M</div>
            <div className="text-emerald-600 font-medium">Total Revenue Tracked</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-emerald-100">
            <div className="text-4xl mb-2">🔗</div>
            <div className="text-2xl font-bold text-emerald-800">2,220</div>
            <div className="text-emerald-600 font-medium">Suspicious Connections</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-emerald-600 text-sm">
        <p>California Healthcare Fraud Detection System</p>
      </div>
    </div>
  );
}
