'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MoreVertical, Settings, LogIn, LogOut } from 'lucide-react';
import { gsap } from 'gsap';
import ShinyText from './ShinyText';

// Type for the auth state (replace with your actual auth logic)
interface AuthState {
  isAuthenticated: boolean;
}

// Placeholder for authentication state (replace with your auth logic, e.g., NextAuth.js)
const authState: AuthState = { isAuthenticated: false };

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const siteNameRef = useRef<HTMLAnchorElement | null>(null);

  // Toggle menu visibility
  const toggleMenu = (): void => {
    setIsMenuOpen((prev) => !prev);
  };

  // GSAP animation for the dropdown menu
  useEffect(() => {
    if (menuRef.current) {
      if (isMenuOpen) {
        gsap.fromTo(
          menuRef.current,
          {
            opacity: 0,
            y: -20,
            scale: 0.9,
            transformOrigin: 'top right',
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: 'elastic.out(1, 0.3)', // Smooth landing with a slight bounce
            display: 'block',
          }
        );
      } else {
        gsap.to(menuRef.current, {
          opacity: 0,
          y: -10,
          scale: 0.9,
          duration: 0.3,
          ease: 'power2.in',
          display: 'none',
        });
      }
    }
  }, [isMenuOpen]);

  // GSAP animation for the site name letters (via ShinyText)
  useEffect(() => {
    if (siteNameRef.current) {
      const letters = siteNameRef.current.querySelectorAll('.letter');
      gsap.to(letters, {
        color: '#ff4d4d',
        textShadow: '0 0 8px rgba(255, 77, 77, 0.8), 0 0 12px rgba(255, 77, 77, 0.6)',
        duration: 0.3,
        stagger: 0.1,
        repeat: -1,
        repeatDelay: 3,
        ease: 'power2.inOut',
        yoyo: true,
      });
    }
  }, []);

  // Split the site name into individual letters
  const siteName = 'Kalifa Dashboard'.split('').map((char, index) => (
    <span
      key={index}
      className="letter"
      style={{ display: char === ' ' ? 'inline' : 'inline-block' }}
    >
      {char}
    </span>
  ));

  return (
    <nav
      className="fixed flex justify-center items-center top-0 left-0 w-screen z-50 h-16 backdrop-blur-md shadow-lg"
      
    >
      <div className="w-full container px-4 sm:px-6 lg:px-8">
        <div className="relative w-full flex items-center justify-between">
          {/* Site Name */}
          <div className="flex items-center">
            <Link
              href="/"
              className="text-2xl font-bold text-[#e3e3e3a4]"
            >
              <ShinyText text={siteName} disabled={false} speed={3} className="custom-class" />
            </Link>
          </div>

          {/* Three Dot Menu */}
          <div className="flex items-center">
            <button
              onClick={toggleMenu}
              className="p-2 rounded-full text-gray-200 hover:bg-gray-900/20 focus:outline-none transition-colors duration-200"
              aria-label="Menu"
            >
              <MoreVertical className="h-6 w-6" />
            </button>

            {/* Dropdown Menu */}
            <div
              ref={menuRef}
              className="absolute top-16  border border-gray-400  right-4 w-48 hidden rounded-lg shadow-xl"
              
            >
              <div className="w-full h-full bg-[#00000033]  backdrop-blur">
              <div className="py-1">
                <Link
                  href="/settings"
                  className="flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Settings
                </Link>
                <Link
                  href={authState.isAuthenticated ? '/logout' : '/login'}
                  className="flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {authState.isAuthenticated ? (
                    <>
                      <LogOut className="h-5 w-5 mr-2" />
                      Logout
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Login
                    </>
                  )}
                </Link>
              </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 