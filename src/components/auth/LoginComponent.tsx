'use client';

import { useState, useEffect } from 'react';
import { Lock, User, Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import { auth } from '@/server/firebaseApi';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface LoginForm {
  email: string;
  password: string;
}

const LoginComponent: React.FC = () => {
  const [formData, setFormData] = useState<LoginForm>({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const router = useRouter();

  // Auth state listener
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

  // Remove GSAP — use simple fade-in after auth check
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

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
      const errorMessage = err.code === 'auth/user-not-found' 
        ? 'No user found with this email.'
        : err.code === 'auth/wrong-password'
        ? 'Incorrect password.'
        : err.message || 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    setResetSuccess(null);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess('Password reset email sent! Check your inbox.');
      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail('');
      }, 3000);
    } catch (err: any) {
      setError(err.code === 'auth/user-not-found' 
        ? 'No account found with this email.' 
        : 'Failed to send reset email. Try again.'
      );
    } finally {
      setIsResetting(false);
    }
  };

  // Loading state with fade-in
  if (isAuthenticated === null || isLoading) {
    return (
      <section className="min-h-screen w-screen flex items-center justify-center bg-black/20 backdrop-blur z-[100] fixed top-0 left-0">
        <div className="animate-spin">
          <Loader2 className="h-10 w-10 text-red-500" />
        </div>
      </section>
    );
  }

  // Redirect if authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Main Login */}
      <section className="min-h-screen w-screen flex items-center justify-center bg-black/20 fixed top-0 left-0 backdrop-blur z-[100]">
        <div 
          className={`
            login-container w-full max-w-md p-6 bg-black/40 backdrop-blur-md 
            rounded-xl shadow-lg border border-red-800/20
            transition-all duration-500 ease-out
            ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
          `}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-red-500 text-center animate-fadeIn">
              Login
            </h2>

            {/* Error Message */}
            {error && (
              <p className="text-red-400 text-sm text-center bg-red-800/30 p-2 rounded animate-slideDown">
                {error}
              </p>
            )}

            {/* Email Field */}
            <div className="relative group">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 transition-colors group-focus-within:text-red-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className="w-full pl-10 pr-4 py-2 bg-black/20 border border-red-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all duration-300"
                disabled={isSubmitting}
              />
            </div>

            {/* Password Field with Toggle */}
            <div className="relative group">
              <Lock className="absolute left-a top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 transition-colors group-focus-within:text-red-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full pl-10 pr-12 py-2 bg-black/20 border border-red-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all duration-300"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors duration-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-sm text-red-400 hover:text-red-300 underline-offset-2 hover:underline transition-all duration-200"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.email || !formData.password}
              className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed font-medium transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg"
            >
              {isSubmitting && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
              {isSubmitting ? 'Logging In...' : 'Login'}
            </button>
          </form>
        </div>
      </section>

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fadeIn">
          <div className="bg-black/50 backdrop-blur-md border border-red-800/30 rounded-xl p-6 w-full max-w-md animate-slideUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-red-500">Reset Password</h3>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetEmail('');
                  setError(null);
                  setResetSuccess(null);
                }}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <p className="text-gray-300 text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 transition-colors group-focus-within:text-red-400" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Your email"
                  className="w-full pl-10 pr-4 py-2 bg-black/20 border border-red-800/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-300"
                  required
                  disabled={isResetting}
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-800/30 p-2 rounded animate-slideDown">{error}</p>
              )}
              {resetSuccess && (
                <p className="text-green-400 text-sm bg-green-800/30 p-2 rounded animate-slideDown">{resetSuccess}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetEmail('');
                    setError(null);
                    setResetSuccess(null);
                  }}
                  className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !resetEmail}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center justify-center disabled:bg-gray-500"
                >
                  {isResetting && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
                  {isResetting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginComponent;