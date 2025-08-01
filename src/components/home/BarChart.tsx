'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { db } from '@/server/firebaseApi';
import { collection, getDocs } from 'firebase/firestore';

const BarChart = () => {
  const [chartData, setChartData] = useState<{ name: string; pv: number }[]>([]);

  useEffect(() => {
    const fetchPageViews = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'pageViews'));
        const data: { name: string; pv: number }[] = [];

        snapshot.forEach((docSnap) => {
          const docId = docSnap.id;
          const docData = docSnap.data();

          if (docId !== 'allView' && docData?.count) {
            data.push({ name: docId, pv: docData.count });
          }
        });

        const topPages = data.sort((a, b) => b.pv - a.pv).slice(0, 7);
        setChartData(topPages);
      } catch (err) {
        console.error('Failed to fetch top page views:', err);
      }
    };

    fetchPageViews();
  }, []);

  return (
    <div className="w-full h-[300px] bg-gradient-to-br from-red-900/10 to-black/20 border border-red-700/30 rounded-2xl shadow-lg p-4">
      <h2 className="text-xl font-semibold text-center text-white mb-4">
        Top Page Views
      </h2>
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
        >
          <XAxis dataKey="name" tick={{ fill: 'white' }} />
          <YAxis tick={{ fill: 'white' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f1f1f', border: 'none' }}
            labelStyle={{ color: '#fff' }}
            itemStyle={{ color: '#f87171' }}
          />
          <Legend wrapperStyle={{ color: '#fff' }} />
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <Bar dataKey="pv" fill="#f87171" radius={[4, 4, 0, 0]} />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;