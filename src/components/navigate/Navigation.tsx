'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MoreVertical, Settings, LogOut, LayoutDashboard, User } from 'lucide-react';
import { gsap } from 'gsap';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { app } from '@/server/firebaseApi';

const auth = getAuth(app);

// Simple internal ShinyText component to ensure the UI looks good immediately
// You can replace this with your own import if you prefer.
const ShinyText = ({ text }: { text: string }) => {
  return (
    <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-200 via-white to-gray-200 font-bold tracking-tight animate-pulse">
      {text}
    </span>
  );
};

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Entrance Animation
  useEffect(() => {
    gsap.fromTo(navRef.current, 
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: 'power4.out', delay: 0.2 }
    );
  }, []);

  // Menu Animation
  useEffect(() => {
    if (menuRef.current) {
      if (isMenuOpen) {
        gsap.fromTo(
          menuRef.current,
          { opacity: 0, y: -10, scale: 0.95, transformOrigin: 'top right' },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.7)', display: 'block' }
        );
      } else {
        gsap.to(menuRef.current, {
          opacity: 0, y: -10, scale: 0.95, duration: 0.2, ease: 'power2.in', display: 'none'
        });
      }
    }
  }, [isMenuOpen]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && !navRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full z-50 pointer-events-none flex justify-center pt-6 px-4">
      {/* Floating Island Container */}
      <nav 
        ref={navRef}
        className="pointer-events-auto w-full max-w-4xl bg-[#090909]/80 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-between px-6 py-3 relative transition-all duration-300 hover:border-red-500/30 hover:shadow-[0_0_20px_rgba(220,38,38,0.15)]"
      >
        
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          
          <Link href="/" className="group flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-red-500 transition-transform group-hover:rotate-180 duration-700" />
            <span className="text-lg">
              <ShinyText text="Kalifa Dashboard" />
            </span>
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          
          {/* User Status (Desktop) */}
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Admin Online</span>
            </div>
          )}

          <div className="h-6 w-[1px] bg-white/10 hidden sm:block"></div>

          {/* Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-full transition-all duration-300 border ${
                isMenuOpen 
                  ? 'bg-red-600 text-white border-red-500 rotate-90' 
                  : 'bg-transparent text-gray-400 border-transparent hover:bg-white/5 hover:text-white'
              }`}
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {/* Dropdown Menu */}
            <div
              ref={menuRef}
              className="absolute top-12 right-0 w-56 hidden bg-[#111] border border-[#222] rounded-2xl shadow-2xl overflow-hidden z-[60]"
            >
              <div className="p-2 space-y-1">
                {isAuthenticated && (
                   <div className="px-3 py-2 mb-2 bg-[#1a1a1a] rounded-xl flex items-center gap-3 border border-[#222]">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-black flex items-center justify-center border border-white/10">
                        <User className="w-4 h-4 text-white" />
                     </div>
                     <div>
                       <p className="text-xs font-bold text-white">Administrator</p>
                       <p className="text-[10px] text-gray-500">Access Granted</p>
                     </div>
                   </div>
                )}

                <Link
                  href="/settings"
                  className="flex items-center px-3 py-2.5 text-sm text-gray-300 rounded-lg hover:bg-[#1f1f1f] hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="h-4 w-4 mr-3 text-blue-400" />
                  System Settings
                </Link>

                <div className="h-px bg-[#222] my-1 mx-2"></div>

                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-3 py-2.5 text-sm text-red-400 rounded-lg hover:bg-red-900/10 hover:text-red-300 transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Disconnect
                  </button>
                ) : (
                  <Link 
                    href="/login"
                    className="flex items-center px-3 py-2.5 text-sm text-green-400 rounded-lg hover:bg-green-900/10 hover:text-green-300 transition-colors"
                  >
                     <User className="h-4 w-4 mr-3" />
                     Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navigation;
