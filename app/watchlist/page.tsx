'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { motion, AnimatePresence } from 'framer-motion';
// NOVO: Adicionados Wallet e CheckCircle aos imports do lucide-react
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Loader2, Search, Target, ShieldAlert, LineChart, Filter, Pencil, X, Wallet, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Favorite {
  id: string;
  ticker: string;
  added_at: string;
  entry_price?: number;
  stop_loss?: number;
  target_price?: number;
  status?: string;
}

interface AssetData {
  ticker: string;
  price: number;
  change: number;
  name: string;
}

export default function WatchlistPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [assetsData, setAssetsData] = useState<Record<string, AssetData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'ticker' | 'gainers' | 'losers'>('recent');
  
  const [editingTrade, setEditingTrade] = useState<Favorite | null>(null);
  const [editForm, setEditForm] = useState({ entry_price: '', stop_loss: '', target_price: '' });
  
  // ==========================================
  // NOVO: ESTADOS PARA TRANSFERÊNCIA P/ CARTEIRA
  // ==========================================
  const [transferringTrade, setTransferringTrade] = useState<Favorite | null>(null);
  const [transferForm, setTransferForm] = useState({ quantity: '', price: '' });
  const [isTransferring, setIsTransferring] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const [marketState, setMarketState] = useState({ text: 'A CALCULAR...', badge: '...', color: 'text-slate-400', badgeColor: 'bg-slate-800 text-slate-400' });
  const [sentimentState, setSentimentState] = useState({ text: 'A analisar', percent: 50, color: 'bg-slate-500', textColor: 'text-white' });

  const supabase = createClient();

  // Relógio Dinâmico da B3
  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();
      const bsbTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const day = bsbTime.getDay();
      const hour = bsbTime.getHours();
      const minute = bsbTime.getMinutes();

      const isWeekday = day >= 1 && day <= 5;
      const isMarketHours = (hour > 10 || (hour === 10 && minute >= 0)) && hour < 17;

      if (isWeekday && isMarketHours) {
        setMarketState({ text: 'ABERTO', badge: 'EM DIRETO', color: 'text-emerald-400', badgeColor: 'bg-emerald-500/10 text-emerald-400' });
      } else {
        setMarketState({ text: 'FECHADO', badge: 'OFFLINE', color: 'text-rose-500', badgeColor: 'bg-rose-500/10 text-rose-500' });
      }
    };
    
    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculadora de Sentimento
  useEffect(() => {
    const tickers = Object.keys(assetsData);
    if (tickers.length === 0) {
      setSentimentState({ text: 'Neutro', percent: 50, color: 'bg-slate-500', textColor: 'text-slate-400' });
      return;
    }

    let totalChange = 0;
    tickers.forEach(t => {
      totalChange += (assetsData[t].change || 0);
    });
    const avgChange = totalChange / tickers.length;

    let percent = 50 + (avgChange * 20);
    percent = Math.max(0, Math.min(100, percent));

    if (avgChange > 0.5) {
      setSentimentState({ text: 'Otimista', percent, color: 'bg-emerald-500', textColor: 'text-emerald-400' });
    } else if (avgChange < -0.5) {
      setSentimentState({ text: 'Pessimista', percent, color: 'bg-rose-500', textColor: 'text-rose-500' });
    } else {
      setSentimentState({ text: 'Misto', percent, color: 'bg-primary', textColor: 'text-primary' });
    }
  }, [assetsData]);

  const fetchFavorites = useCallback(async (mounted: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && mounted) {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (mounted) {
        if (error) {
          console.error('Erro ao buscar favoritos:', error);
        } else {
          setFavorites(data || []);
          
          if (data && data.length > 0) {
            try {
              const tickers = data.map(f => f.ticker);
              const res = await fetch('/api/watchlist-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tickers })
              });
              const realData = await res.json();
              setAssetsData(realData);
            } catch (e) {
              console.error('Erro ao buscar dados reais:', e);
            }
          }
        }
        setIsLoading(false);
      }
    } else if (mounted) {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      await fetchFavorites(mounted);
    };
    loadData();
    return () => { mounted = false; };
  }, [fetchFavorites]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_favorites')
      .insert([{ user_id: user.id, ticker: newTicker.toUpperCase().trim() }]);

    if (error) {
      if (error.code === '23505') {
        alert('Este ativo já está na sua Watchlist.');
      } else {
        alert('Erro ao adicionar ativo: ' + error.message);
      }
    } else {
      setNewTicker('');
      setIsAdding(false);
      fetchFavorites(true);
    }
  };

  const handleRemoveAsset = async (id: string) => {
    const { error } = await supabase.from('user_favorites').delete().eq('id', id);
    if (error) {
      alert('Erro ao remover ativo: ' + error.message);
    } else {
      fetchFavorites(true);
    }
  };

  const handleSaveTradeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrade) return;

    const entry = parseFloat(String(editForm.entry_price).replace(',', '.'));
    const stop = parseFloat(String(editForm.stop_loss).replace(',', '.'));
    const target = parseFloat(String(editForm.target_price).replace(',', '.'));

    const { data, error } = await supabase
      .from('user_favorites')
      .update({
        entry_price: isNaN(entry) ? null : entry,
        stop_loss: isNaN(stop) ? null : stop,
        target_price: isNaN(target) ? null : target,
        status: 'active'
      })
      .eq('id', editingTrade.id)
      .select();

    if (error) {
      alert('Erro ao guardar setup: ' + error.message);
    } else if (!data || data.length === 0) {
      alert('BLOQUEIO DE SEGURANÇA: Não tem permissão de UPDATE na tabela "user_favorites". Por favor, execute o script SQL de liberação.');
    } else {
      setEditingTrade(null);
      fetchFavorites(true);
    }
  };

  // ==========================================
  // NOVO: LÓGICA DE TRANSFERÊNCIA PARA CARTEIRA
  // ==========================================
  const openTransferModal = (fav: Favorite) => {
    const currentPrice = assetsData[fav.ticker]?.price;
    setTransferringTrade(fav);
    setTransferForm({
      quantity: '100', // Sugestão padrão de lote
      price: currentPrice ? currentPrice.toFixed(2) : (fav.entry_price?.toString() || '') // Puxa preço atual automaticamente
    });
  };

  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringTrade) return;
    setIsTransferring(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const quantityNum = parseFloat(transferForm.quantity);
    const priceNum = parseFloat(transferForm.price.replace(',', '.'));

    // Inserir na tabela da Carteira Real (user_portfolio)
    const { error } = await supabase.from('user_portfolio').insert({
      user_id: user.id,
      ticker: transferringTrade.ticker,
      quantity: quantityNum,
      average_price: priceNum
    });

    if (error) {
      alert("Erro ao executar ordem: " + error.message);
    } else {
      // Sucesso! Limpa o modal e mostra o aviso.
      setTransferringTrade(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000); // Esconde o aviso após 3 segundos
    }
    setIsTransferring(false);
  };

  const openEditModal = (fav: Favorite) => {
    setEditingTrade(fav);
    setEditForm({
      entry_price: fav.entry_price?.toString() || '',
      stop_loss: fav.stop_loss?.toString() || '',
      target_price: fav.target_price?.toString() || ''
    });
  };

  const getTradeStatus = (currentPrice: number, stop: number, target: number, entry: number) => {
    if (target === stop) return { status: 'ERROR', progress: 0, entryPos: 0, isProfit: false, text: 'Configuração Inválida' };

    const isLong = target > stop; 
    const totalRange = Math.abs(target - stop);
    const currentDist = isLong ? (currentPrice - stop) : (stop - currentPrice);
    const entryDist = isLong ? (entry - stop) : (stop - entry);

    const currentProgress = Math.min(Math.max((currentDist / totalRange) * 100, 0), 100);
    const entryPos = Math.min(Math.max((entryDist / totalRange) * 100, 0), 100);
    const isProfit = isLong ? currentPrice > entry : currentPrice < entry;

    const isStopped = isLong ? currentPrice <= stop : currentPrice >= stop;
    const isTargetHit = isLong ? currentPrice >= target : currentPrice <= target;

    if (isStopped) return { status: 'STOPPED', progress: 0, entryPos, isProfit: false, text: 'STOP LOSS ACIONADO' };
    if (isTargetHit) return { status: 'PROFIT', progress: 100, entryPos, isProfit: true, text: 'ALVO ATINGIDO' };

    return { status: 'RUNNING', progress: currentProgress, entryPos, isProfit };
  };

  const getRowStyle = (statusResult: any) => {
    if (statusResult.status === 'STOPPED') return 'bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
    if (statusResult.status === 'PROFIT') return 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
    return 'bg-surface-dark border-border-dark hover:border-primary/50';
  };

  const sortedFavorites = [...favorites].sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
    if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker);
    
    const dataA = assetsData[a.ticker];
    const dataB = assetsData[b.ticker];
    
    if (sortBy === 'gainers') return (dataB?.change || 0) - (dataA?.change || 0);
    if (sortBy === 'losers') return (dataA?.change || 0) - (dataB?.change || 0);
    
    return 0;
  });

  return (
    <div className="flex min-h-screen bg-background-dark">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
        <Header />

        {/* NOVO: Notificação Toast Global de Sucesso */}
        <AnimatePresence>
          {showSuccessToast && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }} 
              animate={{ opacity: 1, y: 20 }} 
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-0 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-background-dark px-6 py-3 rounded-full font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              <CheckCircle className="w-5 h-5" /> Ativo transferido para a sua Carteira Real!
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 md:space-y-8 pb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">A sua <span className="text-primary">Watchlist</span></h2>
              <p className="text-slate-500 mt-1 font-medium">Performance em tempo real e gestão de risco dos seus ativos favoritos.</p>
            </motion.div>
            
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="flex items-center gap-2 bg-surface-dark border border-border-dark px-4 py-2.5 rounded-xl text-slate-300 font-bold text-sm cursor-pointer hover:border-primary/50 transition-all">
                  <Filter className="w-4 h-4 text-primary" />
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent appearance-none outline-none cursor-pointer pr-4"
                  >
                    <option value="recent">Mais Recentes</option>
                    <option value="ticker">Ordem Alfabética (A-Z)</option>
                    <option value="gainers">Maiores Altas</option>
                    <option value="losers">Maiores Baixas</option>
                  </select>
                </div>
              </div>

              <motion.button 
                onClick={() => setIsAdding(!isAdding)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 bg-primary px-5 py-2.5 rounded-xl text-background-dark font-black shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">{isAdding ? 'Cancelar' : 'Adicionar Ativo'}</span>
              </motion.button>
            </div>
          </div>

          {isAdding && (
            <motion.form 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleAddAsset}
              className="bg-surface-dark p-6 rounded-2xl border border-primary/30 shadow-lg flex flex-col md:flex-row gap-4 items-center"
            >
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  placeholder="Digite o ticker (ex: PETR4, VALE3, ITUB4)..."
                  className="w-full bg-background-dark border border-border-dark rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary/50 text-sm text-white placeholder:text-slate-600 transition-all uppercase"
                  autoFocus
                />
              </div>
              <button type="submit" className="w-full md:w-auto bg-primary text-background-dark px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all">
                Adicionar à Lista
              </button>
            </motion.form>
          )}

          {/* Cartões Dinâmicos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm">
              <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Ativos Monitorizados</p>
              <h3 className="text-2xl font-black text-white">{favorites.length}</h3>
              <p className="text-xs text-slate-500 font-bold mt-2">Monitorização ativa ligada</p>
            </div>
            
            <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm transition-colors duration-500">
              <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Estado do Mercado</p>
              <div className="flex items-center justify-between mt-1">
                <h3 className={`text-2xl font-black ${marketState.color}`}>{marketState.text}</h3>
                <span className={`${marketState.badgeColor} text-[10px] px-2 py-1 rounded-md font-black`}>
                  {marketState.badge}
                </span>
              </div>
            </div>

            <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm transition-all duration-500">
              <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Sentimento da IA</p>
              <div className="flex items-center gap-3 mt-1">
                <h3 className={`text-2xl font-black ${sentimentState.textColor}`}>{sentimentState.text}</h3>
                <div className="flex-1 h-2 bg-background-dark rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${sentimentState.percent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${sentimentState.color}`} 
                  />
                </div>
              </div>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {isLoading ? (
                    <div className="col-span-full py-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                        <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">A Sincronizar Watchlist...</p>
                    </div>
                  ) : sortedFavorites.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-surface-dark rounded-2xl border border-dashed border-slate-700">
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">A sua watchlist está vazia.</p>
                        <button onClick={() => setIsAdding(true)} className="text-primary text-xs font-black mt-2 hover:underline">Adicione o seu primeiro ativo</button>
                    </div>
                  ) : sortedFavorites.map((fav) => {
                    const data = assetsData[fav.ticker];
                    const hasTradeSetup = fav.entry_price && fav.stop_loss && fav.target_price && data;
                    let tradeStatus = null;
                    
                    if (hasTradeSetup) {
                      tradeStatus = getTradeStatus(data.price, fav.stop_loss!, fav.target_price!, fav.entry_price!);
                    }

                    const cardStyle = hasTradeSetup ? getRowStyle(tradeStatus) : 'bg-surface-dark border-border-dark hover:border-primary/50';

                    return (
                      <div key={fav.id} className={`p-6 rounded-2xl border transition-all duration-300 group relative overflow-hidden flex flex-col justify-between ${cardStyle}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-background-dark/50 flex items-center justify-center font-black text-xs text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                              {fav.ticker[0]}
                            </div>
                            <div>
                              <h3 className="font-black text-lg text-white leading-none">{fav.ticker}</h3>
                              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{data?.name?.slice(0, 20) || 'A carregar...'}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                              <p className="text-lg font-mono font-bold text-white">
                                {data ? `R$ ${data.price.toFixed(2)}` : '---'}
                              </p>
                              {data && (
                                 <div className={`flex items-center justify-end gap-1 text-xs font-bold ${data.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                     {data.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                     {data.change.toFixed(2)}%
                                 </div>
                               )}
                          </div>
                        </div>

                        <div className="mb-4 flex-1">
                          {hasTradeSetup && tradeStatus ? (
                            <div className="w-full">
                              {(tradeStatus.status !== 'RUNNING') && (
                                <div className={`mb-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 py-1 rounded-md ${
                                    tradeStatus.status === 'STOPPED' ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  {tradeStatus.status === 'STOPPED' ? <ShieldAlert className="w-4 h-4"/> : <Target className="w-4 h-4"/>}
                                  {tradeStatus.text}
                                </div>
                              )}

                              <div className="relative h-8 w-full mt-2">
                                  <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                    <div className="absolute left-0 top-0 h-full bg-rose-500/20" style={{ width: `${tradeStatus.entryPos}%` }}></div>
                                    <div className="absolute right-0 top-0 h-full bg-emerald-500/20" style={{ width: `${100 - tradeStatus.entryPos}%` }}></div>
                                  </div>
                                  <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-slate-400/50" style={{ left: `${tradeStatus.entryPos}%` }}></div>
                                  <div 
                                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-surface-dark shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 transition-all duration-700 ease-out flex items-center justify-center ${
                                        tradeStatus.isProfit ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                    style={{ left: `${tradeStatus.progress}%` }}
                                  >
                                    <div className="w-1 h-1 bg-white rounded-full"></div>
                                  </div>
                                  
                                  <div className="flex justify-between mt-5 text-[9px] font-bold text-slate-500 uppercase font-mono">
                                    <span className="text-rose-400">STOP: R$ {fav.stop_loss}</span>
                                    <span className="text-emerald-400">ALVO: R$ {fav.target_price}</span>
                                  </div>
                              </div>
                            </div>
                          ) : (
                             <div className="h-12 flex items-center justify-center bg-background-dark/30 rounded-lg border border-dashed border-slate-800">
                                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Sem Setup Definido</span>
                             </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-border-dark/50 mt-auto">
                           <span className="text-[10px] text-slate-600 font-medium">Add: {new Date(fav.added_at).toLocaleDateString('pt-PT')}</span>
                          <div className="flex items-center gap-1">
                            
                            {/* NOVO: Botão Transferir para a Carteira */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); openTransferModal(fav); }}
                              className="text-slate-500 hover:text-emerald-400 transition-colors p-2 rounded-lg hover:bg-emerald-500/10"
                              title="Transferir para a Carteira Real"
                            >
                              <Wallet className="w-4 h-4" />
                            </button>

                            <button 
                              onClick={(e) => { e.stopPropagation(); openEditModal(fav); }}
                              className="text-slate-500 hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-blue-500/10"
                              title="Configurar Trade"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            <Link 
                              href={`/analysis/${fav.ticker}`}
                              className="text-slate-500 hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/10"
                              title="Análise Detalhada"
                            >
                              <LineChart className="w-4 h-4" />
                            </Link>

                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRemoveAsset(fav.id); }}
                              className="text-slate-500 hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-500/10"
                              title="Remover do Radar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </motion.div>
        </div>

        {/* Modal: Editar Setup */}
        <AnimatePresence>
          {editingTrade && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-surface-dark border border-border-dark rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white">Setup <span className="text-primary">{editingTrade.ticker}</span></h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gestão de Risco</p>
                  </div>
                  <button 
                    onClick={() => setEditingTrade(null)}
                    className="p-2 text-slate-500 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveTradeSetup} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Preço de Entrada (R$)</label>
                    <input 
                      type="number" step="0.01" required
                      value={editForm.entry_price}
                      onChange={(e) => setEditForm({...editForm, entry_price: e.target.value})}
                      className="w-full bg-background-dark border border-border-dark rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary/50 text-sm text-white transition-all"
                      placeholder="Ex: 35.50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2">Stop Loss</label>
                      <input 
                        type="number" step="0.01" required
                        value={editForm.stop_loss}
                        onChange={(e) => setEditForm({...editForm, stop_loss: e.target.value})}
                        className="w-full bg-rose-500/5 border border-rose-500/20 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-rose-500/50 text-sm text-white transition-all"
                        placeholder="Ex: 33.00"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Alvo (Target)</label>
                      <input 
                        type="number" step="0.01" required
                        value={editForm.target_price}
                        onChange={(e) => setEditForm({...editForm, target_price: e.target.value})}
                        className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-emerald-500/50 text-sm text-white transition-all"
                        placeholder="Ex: 40.00"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 mt-2 border-t border-border-dark flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setEditingTrade(null)}
                      className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/5 transition-colors uppercase tracking-widest"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-primary text-background-dark py-3 rounded-xl text-xs font-black hover:brightness-110 transition-all uppercase tracking-widest"
                    >
                      Guardar Setup
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* NOVO Modal: Transferir para a Carteira */}
        <AnimatePresence>
          {transferringTrade && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-surface-dark border border-emerald-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-emerald-500/10"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-emerald-500" />
                      Comprar <span className="text-emerald-500">{transferringTrade.ticker}</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Transferir para o Cofre</p>
                  </div>
                  <button onClick={() => setTransferringTrade(null)} className="p-2 text-slate-500 hover:bg-white/5 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleExecuteTrade} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Qtd de Ações</label>
                      <input 
                        type="number" step="1" required
                        value={transferForm.quantity}
                        onChange={(e) => setTransferForm({...transferForm, quantity: e.target.value})}
                        className="w-full bg-background-dark border border-border-dark rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-emerald-500/50 text-sm font-mono text-white transition-all"
                        placeholder="Ex: 100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Preço Pago (R$)</label>
                      <input 
                        type="number" step="0.01" required
                        value={transferForm.price}
                        onChange={(e) => setTransferForm({...transferForm, price: e.target.value})}
                        className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-emerald-500/50 text-sm font-mono text-white transition-all"
                        placeholder="Ex: 38.50"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 mt-2 border-t border-border-dark flex gap-3">
                    <button type="button" onClick={() => setTransferringTrade(null)} disabled={isTransferring} className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/5 transition-colors uppercase tracking-widest">
                      Cancelar
                    </button>
                    <button type="submit" disabled={isTransferring} className="flex-1 bg-emerald-500 text-background-dark py-3 rounded-xl text-xs font-black hover:brightness-110 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                      {isTransferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Executar
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}