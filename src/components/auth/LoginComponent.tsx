'use client';

import { useState, useEffect } from 'react';
import { Lock, User, Loader2 } from 'lucide-react';
import { gsap } from 'gsap';
import { auth } from '@/server/firebaseApi';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface LoginForm {
  email: string;
  password: string;
}

const LoginComponent: React.FC = () => {
  const [formData, setFormData] = useState<LoginForm>({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const tl = gsap.timeline();
    tl.from('.login-container', {
      opacity: 0,
      scale: 0.9,
      duration: 0.8,
      ease: 'power2.out',
    }).to('.spinner', {
      opacity: 0,
      duration: 0.5,
      onComplete: () => setIsLoading(false),
    });
  }, []);

  // While checking auth state
  if (isAuthenticated === null || isLoading) {
    return (
      <section className="min-h-screen w-screen flex items-center justify-center bg-black/20 backdrop-blur  z-[100] fixed top-0 left-0">
        <Loader2 className="h-10 w-10 text-red-500 animate-spin" />
      </section>
    );
  }

  // If user is authenticated, return null (or redirect handled above)
  if (isAuthenticated) {
    return null;
  }

  return (
    <section className="min-h-screen w-screen flex items-center justify-center bg-black/20 fixed top-0 left-0 backdrop-blur z-[100]">
      <div className="login-container w-full max-w-md p-6 bg-black/40 backdrop-blur-md rounded-xl shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold text-red-500 text-center">Login</h2>

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-800/30 p-2 rounded">{error}</p>
          )}

          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-red-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              disabled={isSubmitting}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-red-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !formData.email || !formData.password}
            className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300 flex items-center justify-center disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
            {isSubmitting ? 'Logging In...' : 'Login'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default LoginComponent;