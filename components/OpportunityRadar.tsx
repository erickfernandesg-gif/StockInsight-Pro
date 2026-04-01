'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, BarChart2, AlertCircle, Activity, Thermometer } from 'lucide-react';
import Link from 'next/link';

export default function OpportunityRadar() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        const res = await fetch('/api/top-assets');
        const data = await res.json();
        
        if (data && Array.isArray(data)) {
          const quantFilter = data
            .filter(asset => asset.change > 1.5 && asset.isPositive) 
            .sort((a, b) => b.change - a.change)
            .slice(0, 3); 
          
          setOpportunities(quantFilter);
        }
      } catch (error) {
        console.error('Erro ao buscar varredura quantitativa:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOpportunities();
  }, []);

  // Lógica do Termômetro Simplificado para o Iniciante
  const getThermometerDetails = (score: number) => {
    if (score <= 40) return { 
      zone: 'Verde', 
      label: 'Descontado (Oportunidade)', 
      textColor: 'text-emerald-400',
      description: 'Ativo "frio". Bom momento para analisar uma compra.'
    };
    if (score <= 60) return { 
      zone: 'Amarelo', 
      label: 'Preço Justo (Neutro)', 
      textColor: 'text-yellow-400',
      description: 'Ativo estabilizado. Movimentação normal.'
    };
    return { 
      zone: 'Vermelho', 
      label: 'Esticado (Risco Alto)', 
      textColor: 'text-rose-400',
      description: 'Ativo "quente" demais. Risco de queda (correção).'
    };
  };

  return (
    <div className="bg-surface-dark p-6 rounded-2xl border border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.1)] relative overflow-hidden group flex flex-col h-full">
      {/* Efeito Neon */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-inner">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Screener <span className="text-primary">Quantitativo</span></h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Ativos com Forte Momentum</p>
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-start gap-3 bg-background-dark/80 border border-border-dark p-4 rounded-xl relative z-10">
        <Thermometer className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
        <p className="text-[10px] text-slate-400 tracking-wide font-medium leading-relaxed">
          <strong className="text-white uppercase">O Termômetro:</strong> Nossa matemática analisa o mercado em tempo real. Se o pino estiver no <span className="text-emerald-400 font-bold">Verde</span>, a ação está barata. Se estiver no <span className="text-rose-400 font-bold">Vermelho</span>, o preço subiu rápido demais e é perigoso comprar agora.
        </p>
      </div>

      <div className="space-y-4 relative z-10 flex-1">
        {isLoading ? (
          <div className="flex justify-center py-6 h-full items-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-8 bg-background-dark/50 rounded-xl border border-dashed border-slate-700 h-full flex items-center justify-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sem anomalias relevantes no mercado.</p>
          </div>
        ) : (
          opportunities.map((asset, index) => {
            // AQUI: Consome a matemática real vinda do Backend! Se falhar, assume 50 (Neutro)
            const score = asset.trendScore || 50; 
            const thermo = getThermometerDetails(score);

            return (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                key={asset.ticker} 
                className="bg-background-dark p-4 rounded-xl border border-border-dark hover:border-primary/50 transition-all flex flex-col gap-3 relative overflow-hidden"
              >
                <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-primary/5 rounded-full blur-xl" />
                
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <h4 className="text-lg font-black text-white leading-none">{asset.ticker}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 truncate max-w-[120px]">{asset.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-white">R$ {asset.price.toFixed(2)}</p>
                    <p className="text-xs font-bold text-emerald-400">+{asset.change.toFixed(2)}%</p>
                  </div>
                </div>

                {/* NOVO: Barra do Termômetro Visual */}
                <div className="py-2 relative z-10">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Termômetro:</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${thermo.textColor}`}>
                      {thermo.label}
                    </span>
                  </div>
                  
                  {/* A barra com as 3 cores */}
                  <div className="w-full h-1.5 bg-surface-dark rounded-full overflow-hidden flex relative border border-black/20 shadow-inner">
                    <div className="h-full w-[40%] bg-emerald-500/80" />
                    <div className="h-full w-[20%] bg-yellow-500/80" />
                    <div className="h-full w-[40%] bg-rose-500/80" />
                    
                    {/* O Pino Indicador animado */}
                    <motion.div
                      className="absolute top-0 h-full w-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20"
                      initial={{ left: "0%" }}
                      animate={{ left: `calc(${score}% - 3px)` }}
                      transition={{ type: "spring", stiffness: 50, damping: 15, delay: 0.5 + (index * 0.1) }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">
                    {thermo.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-border-dark/50 relative z-10">
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded shadow-[0_0_10px_rgba(16,185,129,0.2)] text-emerald-400">
                    <Activity className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Alto Fluxo</span>
                  </div>
                  
                  <Link 
                    href={`/analysis/${asset.ticker}`}
                    className="text-[9px] font-black text-primary hover:text-white uppercase tracking-widest flex items-center gap-1 bg-primary/10 hover:bg-primary px-3 py-1.5 rounded transition-all"
                  >
                    Submeter à IA <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}