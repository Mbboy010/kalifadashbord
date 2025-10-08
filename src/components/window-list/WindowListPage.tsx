'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { gsap } from 'gsap';
import { useRouter } from 'next/navigation';
import { db } from '@/server/firebaseApi';
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';

interface WindowApp {
  id: string;
  title: string;
  image: string;
  createdAt: string; // formatted
}

const WindowListPage: React.FC = () => {
  const router = useRouter();
  const [apps, setApps] = useState<WindowApp[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch and sort data (newest first)
  useEffect(() => {
    async function fetchApps() {
      try {
        const appsRef = collection(db, 'Windows-tools');
        const appsQuery = query(appsRef, orderBy('createdAt', 'desc')); // 👈 sort by newest
        const querySnapshot = await getDocs(appsQuery);

        const toolsData: WindowApp[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled App',
            image: data.image || '/images/default.jpg',
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate().toLocaleDateString()
                : String(data.createdAt ?? ''),
          };
        });

        setApps(toolsData);
      } catch (error) {
        console.error('Error fetching apps:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchApps();
  }, []);

  // Animate items
  useEffect(() => {
    if (!loading && apps.length > 0) {
      gsap.from('.app-item', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        stagger: 0.2,
        ease: 'power3.out',
      });
    }
  }, [apps, loading]);

  // Navigate to details
  const handleOpen = (id: string) => {
    router.push(`/windows-files/${id}`);
  };

  return (
    <section className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-black/80 to-red-900/50">
      <div className="max-w-4xl mx-auto mt-14">
        <h2 className="text-3xl font-bold text-red-500 text-center mb-8 tracking-wide">
          Windows Tools List
        </h2>

        {loading ? (
          <p className="text-gray-400 text-center">Loading apps...</p>
        ) : apps.length === 0 ? (
          <p className="text-gray-400 text-center">No apps found.</p>
        ) : (
          <div className="space-y-6">
            {apps.map((app) => (
              <div
                key={app.id}
                className="app-item flex items-center justify-between p-6 bg-black/40 backdrop-blur-md rounded-xl shadow-lg hover:bg-red-900/30 transition-all duration-300 cursor-pointer"
                onClick={() => handleOpen(app.id)}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={app.image}
                    alt={app.title}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-600"
                  />
                  <div>
                    <h3 className="text-lg text-white font-medium">{app.title}</h3>
                    <p className="text-sm text-gray-400">
                      Released: {app.createdAt || 'Unknown'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-gray-400 hover:text-white transition-colors duration-200" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default WindowListPage;