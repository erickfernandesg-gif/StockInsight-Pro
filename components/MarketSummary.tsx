'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface MarketItemProps {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  progress: number;
  subtext: string;
  isLoading?: boolean;
}

function MarketCard({ label, value, change, isPositive, progress, subtext, isLoading }: MarketItemProps) {
  if (isLoading) {
    return (
      <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="h-4 w-20 bg-slate-800 rounded"></div>
          <div className="h-4 w-12 bg-slate-800 rounded"></div>
        </div>
        <div className="h-8 w-32 bg-slate-800 rounded mb-4"></div>
        <div className="h-1 w-full bg-slate-800 rounded-full"></div>
        <div className="h-3 w-24 bg-slate-800 rounded mt-4"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm hover:border-primary/30 transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
          isPositive ? 'text-primary bg-primary/10' : 'text-rose-500 bg-rose-500/10'
        }`}>
          {change}
        </span>
      </div>
      <h3 className="text-3xl font-bold text-white tracking-tight group-hover:text-primary transition-colors">
        {value}
      </h3>
      <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${isPositive ? 'bg-primary' : 'bg-rose-500'}`}
        />
      </div>
      <p className="mt-2 text-[10px] text-slate-500 font-mono uppercase">{subtext}</p>
    </motion.div>
  );
}

export default function MarketSummary() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch('/api/market');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMarket();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MarketCard 
        label="Ibovespa"
        value={data?.ibov ? data.ibov.value.toLocaleString('pt-BR') : '---'}
        change={data?.ibov ? `${data.ibov.change >= 0 ? '+' : ''}${data.ibov.change.toFixed(2)}%` : '---'}
        isPositive={data?.ibov ? data.ibov.change >= 0 : true}
        progress={72}
        subtext={data?.ibov ? `Day High: ${data.ibov.high.toLocaleString('pt-BR')}` : '---'}
        isLoading={isLoading}
      />
      <MarketCard 
        label="Dólar Comercial"
        value={data?.usd ? `R$ ${data.usd.value.toFixed(4)}` : '---'}
        change={data?.usd ? `${data.usd.change >= 0 ? '+' : ''}${data.usd.change.toFixed(2)}%` : '---'}
        isPositive={data?.usd ? data.usd.change >= 0 : false}
        progress={45}
        subtext={data?.usd ? `Day Low: ${data.usd.low.toFixed(4)}` : '---'}
        isLoading={isLoading}
      />
      <MarketCard 
        label="Taxa SELIC"
        value={data?.selic ? `${data.selic.value}%` : '---'}
        change="0.00%"
        isPositive={true}
        progress={100}
        subtext={data?.selic ? `Next Copom: ${data.selic.nextCopom}` : '---'}
        isLoading={isLoading}
      />
    </div>
  );
}
