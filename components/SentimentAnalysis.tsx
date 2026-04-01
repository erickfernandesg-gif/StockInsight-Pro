'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion'; // Corrigido para framer-motion (Padrão Vercel)
import { Loader2 } from 'lucide-react';

export default function SentimentAnalysis() {
  const [score, setScore] = useState(50); // Começa no meio (Neutro)
  const [insight, setInsight] = useState("Analisando fluxo do mercado...");
  const [isLoading, setIsLoading] = useState(true);

  // Busca os dados reais para calcular o sentimento
  useEffect(() => {
    const fetchDynamicSentiment = async () => {
      try {
        const res = await fetch('/api/market');
        const data = await res.json();
        
        if (data && data.ibov) {
          const change = data.ibov.change;
          
          // ALGORITMO: 50 é o centro. Cada 1% de variação move 20 pontos na agulha.
          let calcScore = Math.round(50 + (change * 20));
          
          // Trava os limites entre 0 e 100
          if (calcScore > 100) calcScore = 100;
          if (calcScore < 0) calcScore = 0;
          
          setScore(calcScore);

          // INSIGHT DINÂMICO BASEADO NO MERCADO REAL
          if (change >= 1) {
            setInsight(`Forte tendência de alta (${change.toFixed(2)}%). Fluxo comprador dominando o Ibovespa hoje.`);
          } else if (change > 0 && change < 1) {
            setInsight(`Mercado levemente otimista (+${change.toFixed(2)}%). Investidores avaliando o cenário com cautela.`);
          } else if (change < 0 && change > -1) {
            setInsight(`Correção leve no índice (${change.toFixed(2)}%). Sentimento de cautela e realização de lucros.`);
          } else {
            setInsight(`Atenção: Queda acentuada de ${change.toFixed(2)}%. Pressão vendedora e aumento da aversão ao risco.`);
          }
        }
      } catch (err) {
        console.error("Erro ao calcular sentimento:", err);
        setInsight("Modo offline: Não foi possível sincronizar o sentimento do mercado.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDynamicSentiment();
  }, []);

  // Cálculos do velocímetro
  const rotation = (score / 100) * 180 - 90;
  
  // Rótulo dinâmico dependendo da pontuação
  let sentimentLabel = "Neutro";
  if (score >= 75) sentimentLabel = "Extrema Ganância";
  else if (score >= 55) sentimentLabel = "Ganância";
  else if (score <= 25) sentimentLabel = "Extremo Medo";
  else if (score <= 45) sentimentLabel = "Medo";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white uppercase tracking-tight">Análise de <span className="text-primary">Sentimento</span></h2>
      <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-yellow-500 to-primary opacity-20" />
        
        <p className="text-xs font-medium text-slate-500 mb-6 uppercase tracking-widest">Termômetro do Ibovespa</p>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-24 mb-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
          </div>
        ) : (
          <div className="relative w-48 h-24 mx-auto mb-6 overflow-hidden">
            {/* Fundo do Velocímetro */}
            <svg className="w-full h-full" viewBox="0 0 100 50">
              <path 
                d="M10,50 A40,40 0 0,1 90,50" 
                fill="none" 
                stroke="#1e2e2a" 
                strokeWidth="8" 
                strokeLinecap="round" 
              />
              {/* Degradê do arco */}
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />   {/* Vermelho (Medo) */}
                  <stop offset="50%" stopColor="#fbbf24" />  {/* Amarelo (Neutro) */}
                  <stop offset="100%" stopColor="#10b77f" /> {/* Verde (Ganância) */}
                </linearGradient>
              </defs>
              <motion.path 
                initial={{ pathLength: 0 }}
                animate={{ pathLength: score / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                d="M10,50 A40,40 0 0,1 90,50" 
                fill="none" 
                stroke="url(#gaugeGradient)" 
                strokeWidth="8" 
                strokeLinecap="round" 
              />
            </svg>
            
            {/* Agulha */}
            <motion.div 
              initial={{ rotate: -90 }}
              animate={{ rotate: rotation }}
              transition={{ duration: 1.5, ease: "easeOut", type: "spring", stiffness: 50 }}
              className="absolute bottom-0 left-1/2 w-1 h-16 bg-white origin-bottom -translate-x-1/2 rounded-full shadow-lg z-10"
              style={{ bottom: '0' }}
            />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-4 border-background-dark z-20" />
          </div>
        )}

        <div className="flex flex-col items-center justify-center -mt-4 mb-6">
          <span className="text-4xl font-black text-white tracking-tighter">{score}</span>
          <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${score > 50 ? 'text-primary' : score < 50 ? 'text-rose-500' : 'text-yellow-500'}`}>
            {sentimentLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-background-dark/50 rounded-xl border border-border-dark group hover:border-primary/30 transition-colors">
            <p className="text-slate-500 mb-1 font-bold uppercase tracking-tighter">Otimistas</p>
            <p className="text-lg font-black text-primary">{score}%</p>
          </div>
          <div className="p-3 bg-background-dark/50 rounded-xl border border-border-dark group hover:border-rose-500/30 transition-colors">
            <p className="text-slate-500 mb-1 font-bold uppercase tracking-tighter">Pessimistas</p>
            <p className="text-lg font-black text-rose-500">{100 - score}%</p>
          </div>
        </div>
      </div>

      {/* Insight Box Dinâmico */}
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className={`${score >= 50 ? 'bg-primary' : 'bg-rose-500'} p-4 rounded-xl text-background-dark shadow-lg shadow-primary/10 cursor-pointer transition-colors duration-500`}
      >
        <h4 className="text-sm font-black uppercase tracking-wider mb-1">Visão de Mercado</h4>
        <p className="text-xs font-medium leading-relaxed opacity-90">
          {insight}
        </p>
      </motion.div>
    </div>
  );
}