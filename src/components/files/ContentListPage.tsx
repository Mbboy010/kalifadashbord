'use client';

import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Trash2, Edit2, Check } from 'lucide-react';
import { storage, ID } from '@/server/appwrite';
import { gsap } from 'gsap';
import { db } from '@/server/firebaseApi';
import { collection, getDocs, deleteDoc, doc, updateDoc, getDoc, query, orderBy } from 'firebase/firestore';

interface ContentItem {
  id: string;
  title: string;
  version: string;
}

const ContentListPage: React.FC = () => {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // New loading state
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedVersion, setEditedVersion] = useState<string>('');
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true); // Set loading to true before fetching
      const q = query(collection(db, 'download'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ContentItem[];
      setContents(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false); // Set loading to false after fetching
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      gsap.fromTo(
        itemRefs.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, stagger: 0.15, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [contents, isLoading]);

  const toggleMenu = (id: string) => {
    setIsMenuOpen((prev) => (prev === id ? null : id));
  };

  const handleDelete = async (id: string) => {
    try {
      const docRef = doc(db, 'download', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const appwriteFileId = data.appwriteFileId;

        if (appwriteFileId) {
          await storage.deleteFile('688cce34002223f15e42', appwriteFileId);
        }

        await deleteDoc(docRef);
        fetchData();
      } else {
        console.warn('Document not found.');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  };

  const handleEdit = (item: ContentItem) => {
    setSelectedItem(item);
    setEditedTitle(item.title);
    setEditedVersion(item.version);
    setEditMode(true);
    setIsMenuOpen(null);
  };

  const handleSave = async () => {
    if (selectedItem && editedTitle && editedVersion) {
      await updateDoc(doc(db, 'download', selectedItem.id), {
        title: editedTitle,
        version: editedVersion,
      });
      setEditMode(false);
      setSelectedItem(null);
      fetchData();
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setSelectedItem(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Skeleton UI component
  const SkeletonItem = () => (
    <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md rounded-lg shadow-lg animate-pulse">
      <div className="flex-1">
        <div className="h-5 bg-gray-700/50 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-700/50 rounded w-1/4"></div>
      </div>
      <div className="p-2">
        <div className="h-5 w-5 bg-gray-700/50 rounded-full"></div>
      </div>
    </div>
  );

  return (
    <section className="py-12 min-h-screen px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-black/70 to-red-900/20">
      <div className="max-w-3xl mt-16 mx-auto">
        <h2 className="text-2xl font-bold text-red-500 mb-6 text-center">Content List</h2>

        {editMode && selectedItem && (
          <div className="bg-black/40 backdrop-blur-md p-6 rounded-xl z-20 shadow-lg mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">Edit Content</h3>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full mb-4 p-2 bg-black/20 border border-red-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              placeholder="Title"
            />
            <input
              type="text"
              value={editedVersion}
              onChange={(e) => setEditedVersion(e.target.value)}
              className="w-full mb-4 p-2 bg-black/20 border border-red-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              placeholder="Version (e.g., 1.0.0)"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
              >
                <Check className="inline h-5 w-5 mr-1" /> Save
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {isLoading ? (
            // Render skeleton items while loading
            Array.from({ length: 5 }).map((_, index) => <SkeletonItem key={index} />)
          ) : (
            // Render actual content items
            contents.map((item, index) => (
              <div
                key={item.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md rounded-lg shadow-lg hover:bg-red-900/30 transition-all duration-300 overflow-visible hover:mb-8"
              >
                <div>
                  <h3 className="text-white font-medium">{item.title}</h3>
                  <p className="text-gray-400 text-sm">Version: {item.version}</p>
                </div>
                <div className="">
                  <button
                    onClick={() => toggleMenu(item.id)}
                    className="p-2 text-gray-300 hover:text-white focus:outline-none"
                    aria-label={`More options for ${item.title}`}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  {isMenuOpen === item.id && (
                    <div
                      ref={menuRef}
                      style={{ zIndex: 100 }}
                      className="absolute right-0 top-8 w-32 bg-black/90 backdrop-blur-md rounded-lg shadow-lg"
                    >
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex items-center w-full px-4 py-2 text-red-400 hover:bg-red-900/30 transition-colors duration-200"
                      >
                        <Edit2 className="h-4 w-4 mr-2" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center w-full px-4 py-2 text-red-400 hover:bg-red-900/30 transition-colors duration-200"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default ContentListPage;