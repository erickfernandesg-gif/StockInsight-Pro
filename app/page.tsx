'use client';

import React from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion'; // Importamos o tipo Variants aqui
import { LineChart, Brain, Target, Wallet, ArrowRight, Activity, ShieldCheck, Zap } from 'lucide-react';

export default function LandingPage() {
  // Adicionamos o tipo : Variants para resolver o erro do VS Code e da Vercel
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  // Aqui também definimos como : Variants
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.6, 
        ease: "easeOut" // Agora o TypeScript entende que isso é válido dentro de Variants
      } 
    }
  };

  return (
    <div className="min-h-screen bg-background-dark text-slate-300 font-sans overflow-x-hidden selection:bg-primary/30 selection:text-white">
      
      {/* Efeitos de Luz no Fundo (Neon Blobs) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      {/* NAVBAR MINIMALISTA */}
      <nav className="relative z-10 border-b border-border-dark bg-background-dark/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">
              StockInsight <span className="text-primary">Pro</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="hidden md:block text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link 
              href="/login" 
              className="bg-primary text-background-dark px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-2"
            >
              Acessar Terminal <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-6 pt-32 pb-24 text-center">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-4xl mx-auto space-y-8"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-dark border border-border-dark mb-4">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inteligência Quantitativa Ativa</span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-tight">
              A evolução do seu patrimônio, guiada por <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Inteligência Artificial.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              O terminal definitivo que analisa ações, monitoriza alvos de lucro e protege o seu capital automaticamente. Abandone o achismo e opere como os institucionais.
            </motion.p>
            
            <motion.div variants={itemVariants} className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/login" 
                className="w-full sm:w-auto bg-primary text-background-dark px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:brightness-110 hover:scale-105 transition-all shadow-[0_0_30px_rgba(59,130,246,0.4)]"
              >
                Começar Gratuitamente
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* FEATURES GRID */}
        <section className="max-w-7xl mx-auto px-6 py-24 border-t border-border-dark/50">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">O seu ecossistema <span className="text-primary">completo</span></h2>
            <p className="text-slate-500 mt-4 font-medium max-w-2xl mx-auto">Deixamos a complexidade nos bastidores para que você foque apenas em executar as melhores decisões.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-surface-dark p-8 rounded-3xl border border-border-dark hover:border-primary/50 transition-colors group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] transition-colors group-hover:bg-primary/10" />
              <div className="w-14 h-14 bg-background-dark rounded-2xl flex items-center justify-center border border-border-dark mb-6 text-primary shadow-inner">
                <Brain className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Análise com IA</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Nosso motor inteligente estuda o ativo em segundos, cruzando dados técnicos e sentimento de mercado para entregar um setup claro de Entrada, Alvo e Stop.
              </p>
            </motion.div>

            {/* Card 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-surface-dark p-8 rounded-3xl border border-border-dark hover:border-emerald-500/50 transition-colors group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-[100px] transition-colors group-hover:bg-emerald-500/10" />
              <div className="w-14 h-14 bg-background-dark rounded-2xl flex items-center justify-center border border-border-dark mb-6 text-emerald-400 shadow-inner">
                <Target className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Radar Inteligente</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Guarde setups na Watchlist e deixe o sistema monitorizar por si. Alertas visuais avisam o exato momento de realizar o lucro ou cortar perdas.
              </p>
            </motion.div>

            {/* Card 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-surface-dark p-8 rounded-3xl border border-border-dark hover:border-purple-500/50 transition-colors group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-[100px] transition-colors group-hover:bg-purple-500/10" />
              <div className="w-14 h-14 bg-background-dark rounded-2xl flex items-center justify-center border border-border-dark mb-6 text-purple-400 shadow-inner">
                <Wallet className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Gestão de Carteira</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Transforme planos em património. Execute ordens com um clique e construa o seu histórico de lucros num painel limpo e institucional.
              </p>
            </motion.div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="max-w-4xl mx-auto px-6 pb-32">
          <div className="bg-gradient-to-br from-surface-dark to-background-dark p-1 rounded-3xl border border-border-dark overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            <div className="relative bg-surface-dark p-12 md:p-16 rounded-[22px] text-center border border-white/5">
              <Zap className="w-12 h-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6">
                Pronto para subir de nível?
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                Junte-se à nova geração de investidores que utilizam a tecnologia a seu favor. O seu terminal está à espera.
              </p>
              <Link 
                href="/login" 
                className="inline-flex bg-white text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-slate-200 hover:scale-105 transition-all shadow-xl"
              >
                Criar Conta Agora
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border-dark bg-background-dark py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-black text-white">StockInsight <span className="text-primary">Pro</span></span>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} - Sistema de Análise Quantitativa
          </p>
          <div className="flex items-center gap-4 text-slate-500 text-sm font-medium">
            <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> RLS Seguro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}