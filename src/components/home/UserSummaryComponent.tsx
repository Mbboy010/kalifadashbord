'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  collection,
  getDocs,
  query,
  limit,
  orderBy,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/server/firebaseApi';

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
        const q = query(
          collection(db, 'trialRequests'),
          orderBy('timestamp', 'desc'), // ✅ sort by time
          limit(7)
        );
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

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'trialRequests', id));
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const handleSeeMore = () => {
    router.push('/users');
  };

  return (
    <section className="py-12 px-4 border-t border-dashed border-red-500 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-red-500 mb-6 text-center">User Summaries</h2>

        <div className="space-y-4">
          {loading
            ? Array.from({ length: 7 }).map((_, index) => <SkeletonItem key={index} />)
            : users.map((user) => (
                <div
                  key={user.id}
                  className="relative flex items-start justify-between p-4 bg-black/40 backdrop-blur-md rounded-lg shadow-lg hover:bg-red-900/30 transition-all duration-300"
                >
                  <div>
                    <p className="text-white font-medium">IMEI: {user.imei}</p>
                    <p className="text-gray-400 text-sm">Email: {user.email}</p>
                    <p className="text-gray-400 text-sm">Device: {user.deviceType}</p>
                  </div>

                  {/* Delete Dropdown */}
                  <div className="relative group">
                    <MoreVertical className="text-gray-400 cursor-pointer" />
                    <div className="absolute right-0 mt-2 hidden group-hover:flex flex-col bg-white rounded shadow-lg z-10">
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </button>
                    </div>
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