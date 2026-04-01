'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MarketSummary from '@/components/MarketSummary';
import AssetTable from '@/components/AssetTable';
import NewsSection from '@/components/NewsSection';
import SentimentAnalysis from '@/components/SentimentAnalysis';
import TradeRulerCard from '@/components/TradeRulerCard';
// NOVO: Importação do Radar de Oportunidades
import OpportunityRadar from '@/components/OpportunityRadar';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Briefcase, Wallet, Crosshair, Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);
  
  // ATUALIZADO: Estado para o nome do utilizador
  const [userName, setUserName] = useState('Investidor');

  // ATUALIZADO: Agora guarda todo o objeto de mercado (Ibov e USD)
  const [marketData, setMarketData] = useState<any>(null);

  // NOVOS ESTADOS: Métricas da Carteira
  const [equity, setEquity] = useState(0);
  const [realizedProfit, setRealizedProfit] = useState(0);
  const [winRate, setWinRate] = useState(0);
  
  const supabase = createClient();

  // Função utilitária
  const formatBRL = (val: number) => {
    if (isNaN(val)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  useEffect(() => {
    // Rotina 1: Busca os Trades Ativos, Dados da Carteira e Perfil do Utilizador
    const fetchDashboardData = async () => {
      setIsLoadingTrades(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar Nome do Utilizador
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      if (profile?.full_name) {
        setUserName(profile.full_name.split(' ')[0]); // Pega apenas o primeiro nome
      } else if (user.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name.split(' ')[0]);
      }

      // Buscar Favoritos (Sinais/Monitorização)
      const { data: favorites } = await supabase.from('user_favorites').select('*').eq('user_id', user.id).eq('status', 'active');
      
      // Buscar Posições da Carteira
      const { data: portfolio } = await supabase.from('user_portfolio').select('*').eq('user_id', user.id);
      
      // Buscar Histórico de Trades
      const { data: history } = await supabase.from('trade_history').select('*').eq('user_id', user.id);

      // 1. Processar Watchlist / Monitor de Operações
      const validTrades = favorites ? favorites.filter(f => f.entry_price && f.stop_loss && f.target_price) : [];
      setActiveTrades(validTrades);

      // 2. Extrair Tickers para buscar cotações (Watchlist + Carteira)
      const tickersToFetch = new Set<string>();
      validTrades.forEach(t => tickersToFetch.add(t.ticker));
      if (portfolio) portfolio.forEach(p => tickersToFetch.add(p.ticker));

      const tickersArray = Array.from(tickersToFetch);
      let pricesMap: Record<string, number> = {};

      if (tickersArray.length > 0) {
        try {
          const res = await fetch('/api/watchlist-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: tickersArray })
          });
          const priceData = await res.json();
          
          Object.values(priceData).forEach((item: any) => {
            pricesMap[item.ticker] = item.price;
          });
          
          setLivePrices(pricesMap);
        } catch (err) {
          console.error("Erro ao buscar preços ao vivo:", err);
        }
      }

      // 3. Calcular Patrimônio Atual (Carteira)
      let currentEquityCalc = 0;
      if (portfolio) {
        portfolio.forEach((item: any) => {
          const price = pricesMap[item.ticker] || item.average_price;
          currentEquityCalc += (item.quantity * price);
        });
      }
      setEquity(currentEquityCalc);

      // 4. Calcular Métricas de Histórico (Lucro e Win Rate)
      if (history && history.length > 0) {
        const totalProfit = history.reduce((acc, curr) => acc + curr.profit, 0);
        setRealizedProfit(totalProfit);
        
        const wins = history.filter(h => h.profit > 0).length;
        setWinRate((wins / history.length) * 100);
      }
      
      setIsLoadingTrades(false);
    };

    // Rotina 2: Busca o Status Real do Mercado (Agora pega Ibov e USD)
    const fetchMarketStatus = async () => {
      try {
        const res = await fetch('/api/market');
        const data = await res.json();
        if (data) {
          setMarketData(data);
        }
      } catch (err) {
        console.error("Erro ao buscar status do mercado:", err);
      }
    };

    fetchDashboardData();
    fetchMarketStatus();
  }, [supabase]);

  return (
    <div className="flex h-screen w-full bg-background-dark overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden relative">
        <Header />
        
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto w-full pb-20">
          
          {/* Saudação Personalizada ATUALIZADA */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl font-black text-white">Bem-vindo, <span className="text-primary">{userName}</span>!</h2>
            <p className="text-slate-500 font-medium mt-1">Aqui está o resumo do seu terminal e carteira hoje.</p>
          </motion.div>

          {/* NOVOS CARDS: Métricas da Carteira e Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface-dark p-6 rounded-2xl border border-border-dark relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <Briefcase className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Património Atual</span>
              </div>
              <h3 className="text-2xl font-mono font-black text-white">{formatBRL(equity)}</h3>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-primary/5 p-6 rounded-2xl border border-primary/20 relative overflow-hidden">
              <div className="flex items-center gap-3 text-primary mb-2">
                <Wallet className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Lucro Realizado</span>
              </div>
              <h3 className={`text-2xl font-mono font-black ${realizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {realizedProfit >= 0 ? '+' : ''}{formatBRL(realizedProfit)}
              </h3>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-surface-dark p-6 rounded-2xl border border-border-dark">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <Crosshair className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Win Rate</span>
              </div>
              <h3 className="text-2xl font-mono font-black text-white">{winRate.toFixed(1)}%</h3>
              <div className="w-full bg-background-dark h-1.5 mt-3 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${winRate}%` }} />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-surface-dark p-6 rounded-2xl border border-border-dark">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <Activity className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Sinais em Fila</span>
              </div>
              <h3 className="text-2xl font-mono font-black text-white">{activeTrades.length} Ativos</h3>
            </motion.div>
          </div>

          {/* Visão Geral do Mercado Original */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <h2 className="text-xl md:text-2xl font-black text-white mb-6 tracking-tight uppercase flex items-center gap-3 mt-4">
              Visão do <span className="text-primary">Mercado</span>
              <div className="size-2 rounded-full bg-green-500 animate-pulse mt-1" />
            </h2>
            <MarketSummary />
          </motion.div>

          {/* Monitor de Operações Original */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white tracking-tight uppercase">
                Monitor de <span className="text-primary">Operações</span>
              </h2>
              <span className="text-[10px] font-bold text-slate-500 uppercase bg-surface-dark px-3 py-1 rounded-full border border-border-dark">
                Gestão em Tempo Real
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {isLoadingTrades ? (
                 <div className="col-span-full flex items-center text-slate-500 py-8">
                   <Loader2 className="w-5 h-5 animate-spin mr-3 text-primary" />
                   <span className="text-sm font-bold uppercase tracking-widest">Sincronizando Operações...</span>
                 </div>
              ) : activeTrades.length === 0 ? (
                 <div className="col-span-full bg-surface-dark/50 border border-dashed border-border-dark rounded-2xl p-12 text-center text-slate-500">
                   <p className="text-sm font-bold uppercase tracking-widest">Nenhuma operação ativa.</p>
                   <p className="text-xs mt-2">Faça uma análise de ativo e salve o setup para monitorar aqui.</p>
                 </div>
              ) : (
                 activeTrades.map((trade) => (
                   <TradeRulerCard 
                      key={trade.id}
                      ticker={trade.ticker} 
                      entry={trade.entry_price} 
                      stop={trade.stop_loss} 
                      target={trade.target_price} 
                      current={livePrices[trade.ticker] || trade.entry_price} 
                   />
                 ))
              )}
            </div>
          </motion.section>

          {/* Colunas Inferiores Originais */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 pt-4">
            <motion.div 
              className="xl:col-span-2 space-y-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <AssetTable />
              <NewsSection />
            </motion.div>

            {/* Coluna Lateral Original: Sentimento, Status Widget E OPORTUNIDADES */}
            <motion.div 
              className="space-y-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <SentimentAnalysis />
              
              {/* DINÂMICO E ATUALIZADO: Market Status Widget */}
              <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`size-2 rounded-full animate-pulse ${marketData ? 'bg-primary' : 'bg-slate-600'}`} />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Visão Global</span>
                </div>
                
                <div className="space-y-6">
                  {/* Ibovespa */}
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter mb-1">Índice Ibovespa</p>
                    <div className="flex items-baseline gap-2">
                      {marketData?.ibov ? (
                        <>
                          <span className="text-2xl font-black text-white">
                            {marketData.ibov.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                          <span className={`text-sm font-bold ${marketData.ibov.change >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                            {marketData.ibov.change >= 0 ? '+' : ''}{marketData.ibov.change.toFixed(2)}%
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-slate-500 animate-pulse">Calculando...</span>
                      )}
                    </div>
                  </div>

                  {/* Linha Divisória */}
                  <div className="w-full h-[1px] bg-border-dark/50" />

                  {/* Dólar */}
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter mb-1">Dólar (USD/BRL)</p>
                    <div className="flex items-baseline gap-2">
                      {marketData?.usd ? (
                        <>
                          <span className="text-2xl font-black text-white">
                            R$ {marketData.usd.value.toFixed(4)}
                          </span>
                          <span className={`text-sm font-bold ${marketData.usd.change >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {marketData.usd.change >= 0 ? '+' : ''}{marketData.usd.change.toFixed(2)}%
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-slate-500 animate-pulse">Calculando...</span>
                      )}
                    </div>
                  </div>

                  {/* Linha Divisória */}
                  <div className="w-full h-[1px] bg-border-dark/50" />

                  {/* Taxa SELIC */}
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter mb-1">Taxa SELIC</p>
                    <div className="flex items-baseline gap-2">
                      {marketData?.selic ? (
                        <>
                          <span className="text-2xl font-black text-white">{marketData.selic.value.toFixed(2)}%</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Meta Anual</span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-slate-500 animate-pulse">Sincronizando...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* NOVO: RADAR DE OPORTUNIDADES */}
              <OpportunityRadar />

            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}