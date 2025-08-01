'use client';

import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { db } from '@/server/firebaseApi';
import {
  doc,
  getDoc,
  collection,
  getDocs, // ✅ Import getDocs to count documents
} from 'firebase/firestore';

export default function Hero() {
  const [greeting, setGreeting] = useState('Welcome back');
  const [dashboardStats, setDashboardStats] = useState({
    visits: 0,
    downloads: 0,
    systems: 0,
    pages: 0, // ✅ Add pages stat
  });
  const statsRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  // Get greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // ✅ Fetch Firestore data
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const visitsSnap = await getDoc(doc(db, 'pageViews', 'allView'));
        const downloadsSnap = await getDoc(doc(db, 'toolClicks', 'allDownload'));
        const systemsSnap = await getDoc(doc(db, 'clicks', 'allCheck'));

        const visits = visitsSnap.exists() ? visitsSnap.data().count || 0 : 0;
        const downloads = downloadsSnap.exists() ? downloadsSnap.data().count || 0 : 0;
        const systems = systemsSnap.exists() ? systemsSnap.data().count || 0 : 0;

        // ✅ Get number of documents in "pageViews" collection (total pages visited)
        const pageViewsSnapshot = await getDocs(collection(db, 'pageViews'));
        const pages = pageViewsSnapshot.size - 1; // exclude 'allView' doc

        console.log("Fetched Firestore data:", { visits, downloads, systems, pages });

        setDashboardStats({ visits, downloads, systems, pages });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
    };

    fetchStats();
  },[]);

  // Animate stats
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
            ease: 'bounce.out',
            delay: index * 0.1,
          }
        );
      }
    });
  }, [dashboardStats]);

  return (
    <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-600 to-red-700 animate-pulse-slow">
          {greeting}, Admin!
        </h1>
        <p className="text-xl md:text-2xl mb-12 text-gray-200 font-light italic">
          Your Kalifa Dashboard is thriving—check your key metrics below.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {Object.entries(dashboardStats).map(([key, value], index) => (
            <div
              key={key}
              className="bg-gradient-to-br from-black/20 to-red-900/20 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-red-800/30 hover:-translate-y-2 hover:shadow-3xl transition-all duration-300 transform-gpu"
            >
              <h2 className="text-xl md:text-2xl font-semibold text-red-300 uppercase tracking-wide">
                {key}
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