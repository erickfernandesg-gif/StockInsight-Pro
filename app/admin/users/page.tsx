'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { motion } from 'framer-motion'; // Ajustado de 'motion/react' para 'framer-motion' que é o padrão
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Shield,
  User,
  LogOut,
  Loader2,
  Settings2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
}

export default function UserManagementPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createClient();
  const router = useRouter();

  // CORREÇÃO: Função fetchProfiles movida para fora do useEffect e envolvida em useCallback
  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      setProfiles(data || []);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      alert('Error updating role: ' + error.message);
    } else {
      // Agora a função é visível aqui!
      fetchProfiles();
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId);

    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      // Agora a função é visível aqui!
      fetchProfiles();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background-dark">
      <aside className="hidden md:flex w-64 border-r border-border-dark bg-surface-dark flex-col shrink-0 h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-background-dark shadow-lg shadow-primary/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">StockInsight</h1>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Admin Terminal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {[
            { icon: User, label: 'User Management', active: true },
            { icon: Shield, label: 'Security Logs' },
            { icon: Settings2, label: 'System Settings' },
          ].map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                item.active 
                  ? 'bg-primary/10 text-primary font-semibold' 
                  : 'text-slate-400 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              {item.icon && <item.icon className="w-5 h-5" />}
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border-dark">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all group"
          >
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-rose-500" />
            <span className="text-sm font-bold uppercase tracking-widest">Log Out</span>
          </button>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 md:space-y-8">
          <div className="flex items-end justify-between">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">User <span className="text-primary">Management</span></h2>
              <p className="text-slate-500 mt-1 font-medium">Control access and define roles for team members.</p>
            </motion.div>
            
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 bg-primary px-5 py-2.5 rounded-xl text-background-dark font-black shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
            >
              <UserPlus className="w-5 h-5" />
              Create User
            </motion.button>
          </div>

          <div className="relative max-w-xl group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users by name, email or role..."
              className="w-full bg-surface-dark border-border-dark rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary/50 text-sm text-white placeholder:text-slate-600 border transition-all"
            />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-dark rounded-2xl border border-border-dark shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-border-dark bg-background-dark/30">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                        <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Loading profiles...</p>
                      </td>
                    </tr>
                  ) : filteredProfiles.map((user) => (
                    <tr key={user.id} className="hover:bg-primary/5 transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-black text-[10px] text-primary">
                            {user.full_name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="font-black text-white group-hover:text-primary transition-colors">{user.full_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400 font-medium">{user.email}</td>
                      <td className="px-6 py-4">
                        <select 
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          className="bg-background-dark border border-border-dark rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="user">User</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={user.status}
                          onChange={(e) => handleUpdateStatus(user.id, e.target.value)}
                          className={`bg-background-dark border border-border-dark rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 cursor-pointer ${
                            user.status === 'active' ? 'text-primary focus:ring-primary' : 'text-rose-500 focus:ring-rose-500'
                          }`}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="pending">Pending</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="text-slate-500 hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/10">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="text-slate-500 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-500/10">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-background-dark/30 border-t border-border-dark flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">Showing <span className="font-black text-white">{filteredProfiles.length}</span> users</p>
              <div className="flex gap-1">
                <button className="p-2 border border-border-dark rounded-lg text-slate-500 hover:bg-primary/5 hover:text-primary transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <button className="w-10 h-10 rounded-lg bg-primary text-background-dark font-black text-xs">1</button>
                <button className="p-2 border border-border-dark rounded-lg text-slate-500 hover:bg-primary/5 hover:text-primary transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}