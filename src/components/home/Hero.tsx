'use client';

import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

// Placeholder data (replace with actual data from an API or state management)
const initialDashboardStats = {
  views: 1250,
  pages: 15,
  downloads: 320,
  systems: 45,
};

export default function Hero() {
  const [greeting, setGreeting] = useState<string>('Welcome back');
  const [dashboardStats, setDashboardStats] = useState(initialDashboardStats);
  const statsRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    // Dynamic greeting based on current time (02:27 PM WAT)
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Simulate data update (replace with real data source)
  useEffect(() => {
    const interval = setInterval(() => {
      setDashboardStats((prev) => ({
        views: prev.views + Math.floor(Math.random() * 50),
        pages: prev.pages + Math.floor(Math.random() * 2),
        downloads: prev.downloads + Math.floor(Math.random() * 20),
        systems: prev.systems + Math.floor(Math.random() * 5),
      }));
    }, 5000); // Update every 5 seconds for demo
    return () => clearInterval(interval);
  }, []);

  // Animate numbers when they change
  useEffect(() => {
    statsRefs.current.forEach((ref, index) => {
      if (ref) {
        gsap.fromTo(
          ref,
          { y: -50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'bounce.out', // Smooth drop with a bounce effect
            delay: index * 0.1, // Staggered animation
          }
        );
      }
    });
  }, [dashboardStats]);

  return (
    <section
      className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 text-white"
      
    >
      <div className="max-w-7xl mx-auto text-center">
        {/* Greeting */}
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-600 to-red-700 animate-pulse-slow">
          {greeting}, Admin!
        </h1>
        <p className="text-xl md:text-2xl mb-12 text-gray-200 font-light italic">
          Your Kalifa Dashboard is thriving—check your key metrics below.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {Object.entries(dashboardStats).map(([key, value], index) => (
            <div
              key={key}
              className="bg-gradient-to-br from-black/20 to-red-900/20 backdrop-blur-md p-6 bg-opacity-20  rounded-xl shadow-2xl border border-red-800/30 hover:-translate-y-2 hover:shadow-3xl transition-all duration-300 transform-gpu"
            >
              <h2 className="text-xl md:text-2xl font-semibold text-red-300 uppercase tracking-wide">
                {key.charAt(0).toUpperCase() + key.slice(1).replace(/s$/, '')}
              </h2>
              <p
                ref={(el) => (statsRefs.current[index] = el)}
                className="text-4xl md:text-5xl font-extrabold mt-4 text-white"
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}