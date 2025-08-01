'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/server/firebaseApi';
import { collection, getDocs } from 'firebase/firestore';

export default function Content() {
  const [topDownloads, setTopDownloads] = useState<{ name: string; count: number }[]>([]);
  const [topSystems, setTopSystems] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const downloadSnap = await getDocs(collection(db, 'toolClicks'));
        const systemSnap = await getDocs(collection(db, 'clicks'));

        const downloads: { name: string; count: number }[] = [];
        const systems: { name: string; count: number }[] = [];

        downloadSnap.forEach((doc) => {
          if (doc.id !== 'allDownload') {
            const data = doc.data();
            downloads.push({ name: doc.id, count: data.count || 0 });
          }
        });

        systemSnap.forEach((doc) => {
          if (doc.id !== 'allCheck') {
            const data = doc.data();
            systems.push({ name: doc.id, count: data.count || 0 });
          }
        });

        setTopDownloads(downloads.sort((a, b) => b.count - a.count).slice(0, 5));
        setTopSystems(systems.sort((a, b) => b.count - a.count).slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard content:', error);
      }
    };

    fetchData();
  }, []);

  const renderList = (items: { name: string; count: number }[]) =>
    items.map((item, i) => (
      <li key={i} className="flex justify-between py-1 border-b border-red-900/30 text-gray-300">
        <span>{item.name}</span>
        <span className="font-semibold text-red-400">{item.count}</span>
      </li>
    ));

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-black/60">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-red-600 mb-8 text-center">Dashboard Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-black/40 backdrop-blur-md p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-red-400 mb-4">Top Downloads</h3>
            <ul>{renderList(topDownloads)}</ul>
          </div>
          <div className="bg-black/40 backdrop-blur-md p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-red-400 mb-4">Top Systems</h3>
            <ul>{renderList(topSystems)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}