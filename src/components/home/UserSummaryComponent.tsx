'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { gsap } from 'gsap';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '@/server/firebaseApi'; // ✅ db import

interface UserSummary {
  id: string;
  imei: string;
  email: string;
  deviceType: string;
}

const SkeletonItem = () => (
  <div className="animate-pulse bg-black/30 backdrop-blur-md p-4 rounded-lg shadow-lg">
    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
    <div className="h-3 bg-gray-700 rounded w-1/2 mb-1" />
    <div className="h-3 bg-gray-700 rounded w-1/3" />
  </div>
);

const UserSummaryComponent: React.FC = () => {
  const router = useRouter();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'trialRequests'), limit(7));
        const querySnapshot = await getDocs(q);
        const usersData: UserSummary[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          imei: doc.data().imei || 'N/A',
          email: doc.data().email || 'N/A',
          deviceType: doc.data().deviceType || 'Unknown',
        }));
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching trialRequests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (!loading) {
      gsap.from('.user-item', {
        opacity: 0,
        y: 50,
        duration: 0.6,
        stagger: 0.2,
        ease: 'power2.out',
      });
    }
  });

  const handleSeeMore = () => {
    router.push('/users');
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-red-500 mb-6 text-center">User Summaries</h2>
        <div className="space-y-4">
          {loading
            ? Array.from({ length: 7 }).map((_, index) => <SkeletonItem key={index} />)
            : users.map((user) => (
                <div
                  key={user.id}
                  className="user-item flex items-center justify-between p-4 bg-black/40 backdrop-blur-md rounded-lg shadow-lg hover:bg-red-900/30 transition-all duration-300"
                >
                  <div>
                    <p className="text-white font-medium">IMEI: {user.imei}</p>
                    <p className="text-gray-400 text-sm">Email: {user.email}</p>
                    <p className="text-gray-400 text-sm">Device: {user.deviceType}</p>
                  </div>
                </div>
              ))}
        </div>
        {!loading && (
          <div className="mt-6 text-center">
            <button
              onClick={handleSeeMore}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300 flex items-center justify-center mx-auto"
            >
              <ChevronRight className="h-5 w-5 mr-2" /> See More
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default UserSummaryComponent;