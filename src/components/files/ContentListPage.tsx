'use client';

import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Trash2, Edit2, Check } from 'lucide-react';
import { gsap } from 'gsap';
import { db } from '@/server/firebaseApi';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';

interface ContentItem {
  id: string;
  title: string;
  version: string;
}

const ContentListPage: React.FC = () => {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedVersion, setEditedVersion] = useState<string>('');
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fetchData = async () => {
    const q = query(collection(db, 'download'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ContentItem[];
    setContents(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    gsap.fromTo(
      itemRefs.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.15,
        duration: 0.5,
        ease: 'power2.out',
      }
    );
  }, [contents]);

  const toggleMenu = (id: string) => {
    setIsMenuOpen((prev) => (prev === id ? null : id));
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'download', id));
    fetchData();
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

  return (
    <section className="py-12 min-h-screen px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-black/70 to-red-900/20">
      <div className="max-w-3xl mt-16 mx-auto">
        <h2 className="text-2xl font-bold text-red-500 mb-6 text-center">
          Content List
        </h2>

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

        <div className="space-y-4 relative z-10">
          {contents.map((item, index) => (
            <div
              key={item.id}
              ref={(el) => {
                itemRefs.current[index] = el; // Updated: Assign without returning
              }}
              className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md rounded-lg shadow-lg hover:bg-red-900/30 transition-all duration-300 relative overflow-visible z-10"
            >
              <div>
                <h3 className="text-white font-medium">{item.title}</h3>
                <p className="text-gray-400 text-sm">Version: {item.version}</p>
              </div>
              <div className="relative z-20">
                <button
                  onClick={() => toggleMenu(item.id)}
                  className="p-2 text-gray-300 hover:text-white focus:outline-none"
                  aria-label={`More options for ${item.title}`}
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {isMenuOpen === item.id && (
                  <div className="absolute right-0 top-8 w-32 bg-black/90 backdrop-blur-md rounded-lg shadow-lg z-50">
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default ContentListPage;