'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { db } from '@/server/firebaseApi';
import { collection, getDocs, orderBy, query, Timestamp, deleteDoc, doc } from 'firebase/firestore';

interface WindowApp {
  id: string;
  title: string;
  image: string;
  createdAt: string;
}

const WindowListPage: React.FC = () => {
  const router = useRouter();
  const [apps, setApps] = useState<WindowApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null); // 👈 track open menu

  // ✅ Fetch and sort data (newest first)
  useEffect(() => {
    async function fetchApps() {
      try {
        const appsRef = collection(db, 'Windows-tools');
        const appsQuery = query(appsRef, orderBy('createdAt', 'desc'));
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

  // ✅ Navigation to details page
  const handleOpen = (id: string) => {
    router.push(`https://kalifaos.vercel.app/windows-tools/${id}`);
  };

  // ✅ Toggle menu visibility
  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(menuOpen === id ? null : id);
  };

  // ✅ Handle edit
  const handleEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/windows-files/${id}`);
  };

  // ✅ Handle delete
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmDelete = confirm('Are you sure you want to delete this item?');
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'Windows-tools', id));
      setApps((prev) => prev.filter((app) => app.id !== id));
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  return (
    <section className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-black/80 to-red-900/50">
      <div className="max-w-4xl mx-auto mt-14 relative">
        <h2 className="text-3xl font-bold text-red-500 text-center mb-8 tracking-wide">
          Windows Tools List
        </h2>

        {loading ? (
          <div className="flex justify-center items-center mt-20">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <p className="text-gray-400 text-center">No apps found.</p>
        ) : (
          <div className="space-y-6 relative z-10">
            {apps.map((app) => (
              <div
                key={app.id}
                className="app-item relative flex items-center justify-between p-6 bg-black/40 backdrop-blur-md rounded-xl shadow-lg hover:bg-red-900/30 transition-all duration-300 cursor-pointer"
                onClick={() => handleOpen(app.id)}
                style={{ zIndex: menuOpen === app.id ? 50 : 1 }} // ✅ bring to front when open
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

                {/* Right-side icons */}
                <div className="flex items-center gap-2 relative z-50"> {/* ✅ keep menu visible */}
                  <MoreVertical
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                    onClick={(e) => toggleMenu(app.id, e)}
                  />

                  {/* Dropdown Menu */}
                  {menuOpen === app.id && (
                    <div
                      className="absolute right-0 top-10 z-[9999] bg-black/90 border border-gray-700 rounded-lg shadow-lg overflow-hidden w-32"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-red-800/40 transition"
                        onClick={(e) => handleEdit(app.id, e)}
                      >
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-red-800/40 transition"
                        onClick={(e) => handleDelete(app.id, e)}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default WindowListPage;