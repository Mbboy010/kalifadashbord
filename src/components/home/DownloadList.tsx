'use client';

import { useEffect, useRef } from 'react';
import { Download, Upload, Server, FilePlus } from 'lucide-react';
import { gsap } from 'gsap';
import { useRouter } from 'next/navigation';

const ButtonList: React.FC = () => {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    buttonRefs.current.forEach((ref, index) => {
      if (ref) {
        gsap.fromTo(
          ref,
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: index * 0.2 }
        );
      }
    });
  }, []);

  const buttons = [
    {
      label: 'Download Files List',
      icon: Download,
      onClick: () => router.push('/downloads'),
    },
    {
      label: 'Upload Download',
      icon: Upload,
      onClick: () => router.push('/upload-download'),
    },
    {
      label: 'System List',
      icon: Server,
      onClick: () => router.push('/systems'),
    },
    {
      label: 'Upload System',
      icon: FilePlus,
      onClick: () => router.push('/upload-system'),
    },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-red-500 mb-6 text-center">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {buttons.map((button, index) => {
            const Icon = button.icon;
            return (
              <button
                key={index}
                ref={(el) => {
                  buttonRefs.current[index] = el;
                }}
                onClick={button.onClick}
                className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-lg bg-black/40 text-white hover:bg-red-600 transition-all"
              >
                <Icon className="h-5 w-5 text-red-400" />
                <span className="text-left">{button.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ButtonList;