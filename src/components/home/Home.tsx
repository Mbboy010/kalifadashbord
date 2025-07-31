'use client';

import { useState, useEffect } from 'react';


// Placeholder data (replace with actual data from an API or state management)


const Home: React.FC = () => {
  const [greeting, setGreeting] = useState<string>('Welcome back');

  useEffect(() => {
    // Simulate dynamic greeting based on time (e.g., morning, afternoon, evening)
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black/80 via-black/50 to-red-900/50" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255, 0, 0, 0.3), rgba(0, 0, 0, 0.7))' }}>



      {/* Hero Section */}


      {/* Additional Dashboard Content (Placeholder) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-black/60">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-red-600 mb-8 text-center">Dashboard Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-black/40 backdrop-blur-md p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-red-400">Recent Activity</h3>
              <p className="mt-4 text-gray-300">Placeholder for recent user actions or system updates.</p>
            </div>
            <div className="bg-black/40 backdrop-blur-md p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-red-400">System Health</h3>
              <p className="mt-4 text-gray-300">Placeholder for system performance metrics.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;