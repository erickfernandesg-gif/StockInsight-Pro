'use client';

import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Newspaper, 
  Wallet, 
  TrendingUp,
  ChevronRight,
  Star,
  Shield,
  LogOut
} from 'lucide-react';
import { motion } from 'framer-motion'; // Ajustado para o padrão comum de importação
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (!error && data) {
            setRole(data.role || 'user');
          } else {
            setRole('user');
          }
        }
      } catch (e) {
        console.error('Error fetching role:', e);
      }
    };
    checkRole();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Itens de Navegação atualizados com a Carteira (Portfolio)
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Star, label: 'Watchlist', href: '/watchlist' },
    { icon: Wallet, label: 'Carteira', href: '/portfolio' }, // NOVO ÍCONE ADICIONADO AQUI
    { icon: BarChart3, label: 'Analysis', href: '/analysis/petr4' },
    { icon: Newspaper, label: 'News Feed', href: '/news' },
  ];

  if (role === 'admin') {
    navItems.push({ icon: Shield, label: 'Admin', href: '/admin/users' });
  }

  return (
    <aside className="w-64 border-r border-border-dark bg-surface-dark flex flex-col shrink-0 h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-background-dark shadow-lg shadow-primary/20">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">StockInsight</h1>
          <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Pro Terminal</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                active 
                  ? 'bg-primary/10 text-primary font-semibold' 
                  : 'text-slate-400 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-slate-500 group-hover:text-primary'}`} />
              <span className="text-sm">{item.label}</span>
              {active && (
                <motion.div 
                  layoutId="active-pill"
                  className="ml-auto w-1 h-4 bg-primary rounded-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border-dark space-y-4">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all group"
        >
          <LogOut className="w-5 h-5 text-slate-500 group-hover:text-rose-500" />
          <span className="text-sm">Log Out</span>
        </button>

        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-colors" />
          <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">Upgrade</p>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">Get real-time Level 2 market data and AI signals.</p>
          <button className="w-full py-2 bg-primary text-background-dark text-xs font-bold rounded-lg hover:brightness-110 transition-all shadow-lg shadow-primary/10">
            Go Premium
          </button>
        </div>
      </div>
    </aside>
  );
}