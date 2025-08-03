'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';

const Footer: React.FC = () => {
  useEffect(() => {
    gsap.from('.footer-content', {
      opacity: 0,
      y: 20,
      duration: 0.6,
      ease: 'power2.out',
    });
  }, []);

  return (
    <footer className="py-6 border border-red-500 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-black/80 to-red-900/20" >
      <div className="max-w-7xl mx-auto text-center text-white footer-content">
        <p className="mb-2">&copy; {new Date().getFullYear()} Kalifa Dashboard. All rights reserved.</p>
        <p className="text-sm text-gray-400">Built with ❤️ by MBBOY</p>
      </div>
    </footer>
  );
};

export default Footer;