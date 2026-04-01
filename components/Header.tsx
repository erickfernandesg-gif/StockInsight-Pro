'use client';

import React, { useEffect, useState } from 'react';
import { Search, Bell, Menu, X, LayoutDashboard, List, Shield, LogOut, TrendingUp, BarChart3, Newspaper, Wallet } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const [profile, setProfile] = useState<{ full_name: string | null; role: string | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();
          
          if (!error && data) {
            setProfile(data);
          } else {
            setProfile({ full_name: user.user_metadata?.full_name || 'User', role: 'user' });
          }
        }
      } catch (e) {
        console.error('Error fetching profile:', e);
      }
    };
    fetchProfile();
  }, [supabase]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const ticker = searchQuery.trim().toUpperCase();
      router.push(`/analysis/${ticker}`);
      setSearchQuery('');
      setIsMobileMenuOpen(false); // Fecha o menu se estiver no mobile
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Watchlist', href: '/watchlist', icon: List },
    { name: 'Carteira', href: '/portfolio', icon: Wallet },
    { name: 'Analysis', href: '/analysis/petr4', icon: BarChart3 },
    { name: 'News Feed', href: '/news', icon: Newspaper },
    ...(profile?.role === 'admin' ? [{ name: 'Admin Terminal', href: '/admin/users', icon: Shield }] : [])
  ];

  return (
    <>
      <header className="h-16 border-b border-border-dark flex items-center justify-between px-4 md:px-8 bg-background-dark/80 backdrop-blur-xl sticky top-0 z-40">
        
        {/* Lado Esquerdo: Menu Mobile + Busca */}
        <div className="flex items-center flex-1 gap-2 md:gap-4">
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open Menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <form onSubmit={handleSearch} className="relative flex-1 max-w-[180px] md:max-w-xl group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-surface-dark/50 border border-border-dark/50 rounded-xl py-1.5 md:py-2 pl-10 pr-4 focus:ring-2 focus:ring-primary/30 text-sm text-white placeholder:text-slate-600 transition-all uppercase placeholder:normal-case"
            />
          </form>
        </div>

        {/* Lado Direito: Notificações + Perfil */}
        <div className="flex items-center gap-2 md:gap-6">
          <button className="p-2 text-slate-400 hover:bg-surface-dark rounded-lg relative transition-colors hidden xs:block">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-background-dark"></span>
          </button>
          
          <div className="h-6 w-[1px] bg-border-dark mx-1 hidden sm:block"></div>
          
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden lg:block">
              <p className="text-sm font-bold text-white leading-none mb-1">
                {profile?.full_name || 'Investor'}
              </p>
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-80">
                {profile?.role === 'admin' ? 'Admin' : 'Pro Member'}
              </p>
            </div>
            <div className="relative w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-primary/20 overflow-hidden ring-offset-2 ring-offset-background-dark group-hover:border-primary/50 transition-all cursor-pointer">
              <Image 
                src={`https://picsum.photos/seed/${profile?.full_name || 'user'}/100/100`} 
                alt="Profile" 
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background-dark/60 backdrop-blur-md"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Drawer Content */}
            <motion.div 
              initial={{ x: '-100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-[280px] bg-surface-dark border-r border-border-dark flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-border-dark flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-background-dark shadow-lg shadow-primary/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h1 className="text-lg font-black tracking-tighter text-white">STOCK<span className="text-primary">INSIGHT</span></h1>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="text-slate-400 w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-8 space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      key={item.name} 
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                        isActive 
                          ? 'bg-primary/10 text-primary font-bold shadow-inner' 
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-slate-500'}`} />
                      <span className="text-sm uppercase tracking-widest">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-6 border-t border-border-dark">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 transition-all font-bold text-xs uppercase tracking-widest border border-rose-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <p className="text-[10px] text-center text-slate-600 mt-6 font-mono opacity-50">PRO TERMINAL v1.0.4</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}