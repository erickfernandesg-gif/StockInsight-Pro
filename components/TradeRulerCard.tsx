'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, AlertTriangle, ArrowUpRight, ArrowDownRight, CheckCircle2, Crosshair, ShieldAlert } from 'lucide-react';

interface TradeRulerProps {
  ticker: string;
  entry: number;
  stop: number;
  target: number;
  current: number;
}

export default function TradeRulerCard({ ticker, entry, stop, target, current }: TradeRulerProps) {
  // Formatação de Moeda
  const formatBRL = (val: number) => {
    if (isNaN(val)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Cálculo da percentagem de lucro/prejuízo
  const profitPercent = ((current / entry) - 1) * 100;

  // Cálculo da percentagem da régua (0% = Stop, 100% = Target)
  const range = target - stop;
  let progress = ((current - stop) / range) * 100;
  progress = Math.max(0, Math.min(100, progress)); // Limitar a bolinha entre 0% e 100%

  // Cálculo da posição de entrada na régua
  let entryProgress = ((entry - stop) / range) * 100;
  entryProgress = Math.max(0, Math.min(100, entryProgress));

  // Lógica de Alerta Ativo
  const isStopHit = current <= stop;
  const isTargetHit = current >= target;

  // Estilos Dinâmicos Nativos (Blindados contra o PurgeCSS)
  let cardStyle = 'bg-surface-dark border-border-dark hover:border-primary/30';
  let statusIcon = <Crosshair className="w-3.5 h-3.5" />;
  let statusText = 'Em Andamento';
  let statusColor = 'text-primary';
  let barColor = 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)]';

  if (isTargetHit) {
    // Fundo Verde Escuro com Borda Verde Brilhante
    cardStyle = 'bg-emerald-950/60 border-emerald-500/60 shadow-lg shadow-emerald-500/20';
    statusIcon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    statusText = 'ALVO ATINGIDO!';
    statusColor = 'text-emerald-400 font-black animate-pulse';
    barColor = 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,1)]';
  } else if (isStopHit) {
    // Fundo Vermelho Escuro com Borda Vermelha Brilhante
    cardStyle = 'bg-rose-950/60 border-rose-500/60 shadow-lg shadow-rose-500/20';
    statusIcon = <AlertTriangle className="w-4 h-4 text-rose-500" />;
    statusText = 'STOP ACIONADO!';
    statusColor = 'text-rose-500 font-black animate-pulse';
    barColor = 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,1)]';
  }

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={`p-5 md:p-6 rounded-2xl border transition-all duration-500 flex flex-col justify-between ${cardStyle}`}
    >
      {/* CABEÇALHO DO CARTÃO */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="text-xl font-black text-white tracking-tight">{ticker}</h4>
          <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest mt-1 ${statusColor}`}>
            {statusIcon} <span>{statusText}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-mono font-black text-white">{formatBRL(current)}</p>
          <div className={`flex items-center justify-end gap-1 text-[11px] font-bold uppercase tracking-widest mt-1 ${profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
            {profitPercent >= 0 ? <ArrowUpRight className="w-3.5 h-3.5"/> : <ArrowDownRight className="w-3.5 h-3.5"/>}
            {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* A RÉGUA VISUAL */}
      <div className="mt-4 relative pt-6 pb-2">
        
        {/* Labels de Stop e Alvo */}
        <div className="flex justify-between absolute top-0 w-full">
          <span className="text-rose-500 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest" title="Stop Loss">
            <ShieldAlert className="w-3 h-3"/> {formatBRL(stop)}
          </span>
          <span className="text-emerald-500 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest" title="Take Profit">
            {formatBRL(target)} <Target className="w-3 h-3"/>
          </span>
        </div>
        
        {/* Pista da Régua */}
        <div className="h-2 w-full bg-background-dark/80 rounded-full overflow-hidden relative border border-border-dark shadow-inner mt-2">
          {/* Barra de Progresso Animada */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={`absolute top-0 left-0 h-full rounded-full ${barColor}`}
          />
        </div>

        {/* Marcador do Ponto de Entrada */}
        <div 
          className="absolute top-[30px] w-0.5 h-4 bg-slate-400/50 rounded-full z-10"
          style={{ 
            left: `${entryProgress}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <span className="absolute top-5 left-1/2 transform -translate-x-1/2 text-[8px] text-slate-400 font-bold tracking-widest hidden group-hover:block whitespace-nowrap">
            ENTRADA: {formatBRL(entry)}
          </span>
        </div>

        {/* Agulha do Preço Atual */}
        <motion.div 
          initial={{ left: 0 }}
          animate={{ left: `${progress}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`absolute top-[28.5px] w-3.5 h-3.5 bg-white rounded-full z-20 border-[3px] border-background-dark shadow-[0_0_15px_rgba(255,255,255,0.9)]`}
          style={{ transform: 'translateX(-50%)' }}
        />
      </div>
    </motion.div>
  );
}