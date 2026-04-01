'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

function Sparkline({ data, isPositive }: { data: number[], isPositive: boolean }) {
  const points = data.map((val, i) => `${(i / (data.length - 1)) * 100},${100 - val}`).join(' ');
  return (
    <div className="w-24 h-8">
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <polyline
          fill="none"
          stroke={isPositive ? '#10b77f' : '#f43f5e'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="drop-shadow-[0_0_4px_rgba(16,183,127,0.5)]"
        />
      </svg>
    </div>
  );
}

export default function AssetTable() {
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch('/api/top-assets');
        const json = await res.json();
        setAssets(json);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssets();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-surface-dark rounded-2xl border border-border-dark shadow-sm overflow-hidden p-12 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Market Assets...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-dark rounded-2xl border border-border-dark shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border-dark flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">B3 Top Assets</h2>
        <button className="text-xs font-bold text-primary hover:underline uppercase tracking-wider">View All</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-background-dark/50 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
            <tr>
              <th className="px-6 py-4">Ticker</th>
              <th className="px-6 py-4">Preço</th>
              <th className="px-6 py-4">Variação %</th>
              <th className="px-6 py-4">Vol. Financeiro</th>
              <th className="px-6 py-4 text-right">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dark">
            {assets.map((asset) => (
              <tr 
                key={asset.ticker} 
                onClick={() => router.push(`/analysis/${asset.ticker}`)}
                className="hover:bg-primary/5 transition-colors cursor-pointer group"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-400 group-hover:text-primary transition-colors">
                      {asset.ticker.substring(0, 4)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{asset.ticker}</p>
                      <p className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{asset.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-200">
                  R$ {asset.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4">
                  <span className={`font-bold text-sm flex items-center gap-1 ${asset.isPositive ? 'text-primary' : 'text-rose-500'}`}>
                    {asset.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {asset.change.toFixed(2)}%
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                  {(asset.volume / 1000000).toFixed(1)}M
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <Sparkline data={asset.trend} isPositive={asset.isPositive} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}