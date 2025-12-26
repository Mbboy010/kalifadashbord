'use client';

import { useState, useEffect } from 'react';
import { Lock, User, Loader2, Eye, EyeOff, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      // Small delay to smooth out the loading transition
      setTimeout(() => setIsLoading(false), 500);
    });
    return () => unsubscribe();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
    } catch (err: any) {
      const errorMessage = err.code === 'auth/user-not-found' 
        ? 'Account not found.'
        : err.code === 'auth/wrong-password'
        ? 'Invalid credentials.'
        : 'Authentication failed.';
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
      setResetSuccess('Reset link sent to your email.');
      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail('');
        setResetSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.code === 'auth/user-not-found' 
        ? 'No account found.' 
        : 'Could not send email.'
      );
    } finally {
      setIsResetting(false);
    }
  };

  // Full Screen Loader
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]">
        <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-red-900/30 border-t-red-600 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-red-600 opacity-50" />
            </div>
        </div>
      </div>
    );
  }

  // If logged in, return null (Middleware/Page will handle redirect)
  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center relative overflow-hidden selection:bg-red-500/30">
      
      {/* --- Ambient Background Effects --- */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none"></div>

      {/* --- Main Login Card --- */}
      <div className="w-full max-w-md mx-4 relative z-10">
        
        {/* Glow behind card */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-red-900 rounded-2xl blur opacity-20 transition duration-1000 group-hover:opacity-40"></div>

        <div className="relative bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center">
             <div className="mx-auto w-12 h-12 bg-gradient-to-br from-red-500 to-red-800 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20 mb-6 rotate-3">
                <Lock className="text-white h-6 w-6" />
             </div>
             <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Welcome Back</h2>
             <p className="text-sm text-gray-400">Enter your credentials to access the terminal.</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-5">
            
            {/* Error Display */}
            <div className={`transition-all duration-300 overflow-hidden ${error ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="bg-red-500/10 border-l-2 border-red-500 text-red-200 text-xs p-3 rounded-r">
                   {error}
                </div>
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
               <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest ml-1">Email Address</label>
               <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors">
                     <User size={18} />
                  </div>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-[#121212] border border-white/10 text-gray-200 text-sm rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-gray-600"
                    placeholder="name@example.com"
                  />
               </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
               <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Password</label>
                  <button 
                    type="button" 
                    onClick={() => setShowResetModal(true)}
                    className="text-xs text-red-500 hover:text-red-400 transition-colors"
                  >
                    Forgot?
                  </button>
               </div>
               <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors">
                     <Lock size={18} />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-[#121212] border border-white/10 text-gray-200 text-sm rounded-lg pl-10 pr-10 py-3 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-gray-600"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
               </div>
            </div>

            {/* Submit Button */}
            <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-medium py-3 rounded-lg shadow-lg shadow-red-900/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
                {isSubmitting ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </button>

          </form>
          
          {/* Footer Decoration */}
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-red-900/40 to-transparent"></div>
        </div>
      </div>

      {/* --- Forgot Password Modal --- */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
           {/* Backdrop */}
           <div 
             className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
             onClick={() => setShowResetModal(false)}
           ></div>

           <div className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
              <div className="text-center mb-6">
                 <div className="mx-auto w-10 h-10 bg-red-900/20 rounded-full flex items-center justify-center mb-3">
                    <Mail className="text-red-500 h-5 w-5" />
                 </div>
                 <h3 className="text-lg font-bold text-white">Reset Password</h3>
                 <p className="text-xs text-gray-400 mt-1">Enter your email to receive a recovery link.</p>
              </div>

              {resetSuccess ? (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg text-center mb-4 flex items-center justify-center gap-2">
                     <ShieldCheck size={16} /> {resetSuccess}
                  </div>
              ) : (
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors h-4 w-4" />
                        <input
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="Email address"
                            className="w-full bg-[#151515] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors placeholder:text-gray-600"
                        />
                    </div>
                    {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                    
                    <button 
                        type="submit" 
                        disabled={isResetting || !resetEmail}
                        className="w-full bg-white text-black hover:bg-gray-200 font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isResetting && <Loader2 className="animate-spin h-4 w-4" />}
                        Send Link
                    </button>
                  </form>
              )}

              <button 
                onClick={() => setShowResetModal(false)}
                className="w-full mt-4 text-xs text-gray-500 hover:text-white transition-colors"
              >
                Cancel and go back
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default LoginComponent;
