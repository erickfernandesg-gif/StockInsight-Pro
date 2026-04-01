'use client';

import React, { useState } from 'react';
import { TrendingUp, Mail, Lock, Eye, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  const testConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      if (error) {
        if (error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
          setError('Cannot connect to Supabase. Check if your Project URL is correct and accessible.');
        } else {
          // Table might not exist yet, which is fine, at least we reached the server
          alert('Connection to Supabase successful! (Note: profiles table check returned: ' + error.message + ')');
        }
      } else {
        alert('Connection to Supabase successful!');
      }
    } catch (err: any) {
      setError('Connection test failed: ' + err.message);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError('Supabase configuration is missing. Please check your environment variables in Settings.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        if (!fullName) throw new Error('Full name is required for sign up');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (error) throw error;

        if (data.session) {
          // Se o "Confirm Email" estiver desligado no Supabase, entra direto
          window.location.href = '/dashboard';
        } else {
          // Se precisar confirmar email
          alert('Check your email for the confirmation link!');
          setIsSignUp(false); // Volta para a tela de login
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            throw new Error('Please confirm your email address before logging in. Check your inbox (and spam folder) for a confirmation link.');
          }
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            throw new Error('Invalid email or password. If you registered manually in Supabase, make sure the user is confirmed and the password is correct.');
          }
          throw error;
        }

        if (data.user) {
          // Use window.location.href for a hard redirect to ensure cookies are sent to middleware
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-background-dark">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col w-full max-w-[440px] gap-8 px-4"
      >
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex items-center justify-center size-14 rounded-xl bg-primary/10 border border-primary/20 text-primary mb-2 shadow-xl shadow-primary/5">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">
            Stock<span className="text-primary">Insight</span>
          </h1>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-slate-200">{isSignUp ? 'Create Account' : 'Welcome back'}</h2>
            <p className="text-slate-500 text-sm font-medium">
              {isSignUp ? 'Join the professional trading community' : 'Access your real-time portfolio dashboard'}
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-surface-dark p-8 rounded-2xl border border-border-dark shadow-2xl">
          <form className="flex flex-col gap-5" onSubmit={handleAuth}>
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs p-3 rounded-lg font-bold">
                {error}
              </div>
            )}
            
            {/* Full Name Field (Sign Up Only) */}
            {isSignUp && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex flex-col gap-2"
              >
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input 
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={isSignUp}
                    className="flex w-full rounded-lg border border-border-dark bg-background-dark/50 py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-600"
                    placeholder="John Doe"
                  />
                </div>
              </motion.div>
            )}

            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex w-full rounded-lg border border-border-dark bg-background-dark/50 py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-600"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Password</label>
                {!isSignUp && (
                  <a href="#" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">Forgot password?</a>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="flex w-full rounded-lg border border-border-dark bg-background-dark/50 py-3 pl-10 pr-12 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-background-dark font-black py-3.5 px-4 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <button 
              type="button"
              onClick={testConnection}
              disabled={isCheckingConnection}
              className="w-full border border-border-dark hover:bg-white/5 text-slate-400 text-[10px] font-black py-2 px-4 rounded-lg uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isCheckingConnection ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test Supabase Connection'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-dark"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-[0.2em]">
              <span className="bg-surface-dark px-3 text-slate-500">Or continue with</span>
            </div>
          </div>

          {/* SSO Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border-dark rounded-lg hover:bg-primary/5 transition-colors group"
            >
              <div className="relative w-4 h-4">
                <Image 
                  src="https://picsum.photos/seed/google/20/20" 
                  alt="Google" 
                  fill
                  className="object-contain grayscale group-hover:grayscale-0 transition-all"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-xs font-bold text-slate-300">Google</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border-dark rounded-lg hover:bg-primary/5 transition-colors group">
              <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C4.79 17.43 3.8 11.77 6.13 7.75c1.15-1.99 3.16-3.2 5.34-3.23 1.66-.02 2.81 1.04 3.82 1.04 1.01 0 2.44-1.25 4.35-1.05 1.8.19 3.19.86 4.02 2.07-3.73 2.24-3.13 7.35.61 8.89-.74 1.86-1.74 3.73-3.17 4.81zM12.03 4.52c-.15-2.42 1.85-4.52 4.25-4.52.23 2.84-2.61 4.74-4.25 4.52z" />
              </svg>
              <span className="text-xs font-bold text-slate-300">Apple</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 font-medium">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-black text-primary hover:underline ml-1"
          >
            {isSignUp ? 'Sign In' : 'Create an account'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
