'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, 
  Loader2, Trash2, PieChart, Briefcase, History, CheckCircle, XCircle, AlertTriangle 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PortfolioItem {
  id: string;
  ticker: string;
  quantity: number;
  average_price: number;
  purchase_date?: string;
}

interface TradeHistoryItem {
  id: string;
  ticker: string;
  quantity: number;
  buy_price: number;
  sell_price: number;
  profit: number;
  profit_percent: number;
  close_date: string;
}

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [historyItems, setHistoryItems] = useState<TradeHistoryItem[]>([]);
  const [assetsData, setAssetsData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({ ticker: '', quantity: '', price: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal de Encerrar Posição
  const [assetToClose, setAssetToClose] = useState<PortfolioItem | null>(null);
  const [closePrice, setClosePrice] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // Modais de Exclusão
  const [assetToDelete, setAssetToDelete] = useState<{ id: string, ticker: string } | null>(null);
  const [historyToDelete, setHistoryToDelete] = useState<{ id: string, ticker: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const supabase = createClient();

  const formatBRL = (val: number) => {
    if (isNaN(val)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const fetchPortfolio = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    // 1. Buscar Posições Abertas
    const { data: openData } = await supabase.from('user_portfolio').select('*').eq('user_id', user.id);
    
    // 2. Buscar Histórico
    const { data: closedData } = await supabase.from('trade_history').select('*').eq('user_id', user.id).order('close_date', { ascending: false });

    if (openData) {
      setItems(openData);
      if (openData.length > 0) {
        const tickers = openData.map(i => i.ticker);
        try {
          const res = await fetch('/api/watchlist-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers })
          });
          if (res.ok) {
            const prices = await res.json();
            setAssetsData(prices);
          }
        } catch (e) {
          console.error("Erro ao buscar cotações", e);
        }
      }
    }
    
    if (closedData) setHistoryItems(closedData);
    
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  // Preencher preço atual automaticamente no modal de encerramento
  useEffect(() => {
    if (assetToClose) {
      const currentPrice = assetsData[assetToClose.ticker]?.price;
      if (currentPrice) {
        setClosePrice(currentPrice.toFixed(2));
      } else {
        setClosePrice(assetToClose.average_price.toFixed(2));
      }
    }
  }, [assetToClose, assetsData]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('user_portfolio').insert({
      user_id: user.id,
      ticker: newAsset.ticker.toUpperCase().trim(),
      quantity: parseFloat(newAsset.quantity),
      average_price: parseFloat(newAsset.price.replace(',', '.'))
    });

    if (!error) {
      setIsModalOpen(false);
      setNewAsset({ ticker: '', quantity: '', price: '' });
      fetchPortfolio();
    } else {
      alert("Erro ao guardar: " + error.message);
    }
    setIsSaving(false);
  };

  const handleClosePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetToClose) return;
    setIsClosing(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const sellPriceNum = parseFloat(closePrice.replace(',', '.'));
    const profit = (sellPriceNum - assetToClose.average_price) * assetToClose.quantity;
    const profitPercent = ((sellPriceNum / assetToClose.average_price) - 1) * 100;

    // 1. Inserir no Histórico (Lucro Realizado)
    const { error: insertError } = await supabase.from('trade_history').insert({
      user_id: user.id,
      ticker: assetToClose.ticker,
      quantity: assetToClose.quantity,
      buy_price: assetToClose.average_price,
      sell_price: sellPriceNum,
      profit: profit,
      profit_percent: profitPercent,
      purchase_date: assetToClose.purchase_date || new Date().toISOString()
    });

    if (insertError) {
      alert("Erro ao registar histórico: " + insertError.message);
      setIsClosing(false);
      return;
    }

    // 2. Remover das Posições Abertas
    await supabase.from('user_portfolio').delete().eq('id', assetToClose.id);
    
    setAssetToClose(null);
    fetchPortfolio();
    setIsClosing(false);
  };

  // Funções de Exclusão
  const confirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.from('user_portfolio').delete().eq('id', assetToDelete.id);
    if (!error) {
      setAssetToDelete(null);
      fetchPortfolio();
    } else {
      alert("Erro ao remover ativo: " + error.message);
    }
    setIsDeleting(false);
  };

  const confirmDeleteHistory = async () => {
    if (!historyToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.from('trade_history').delete().eq('id', historyToDelete.id);
    if (!error) {
      setHistoryToDelete(null);
      fetchPortfolio();
    } else {
      alert("Erro ao remover histórico: " + error.message);
    }
    setIsDeleting(false);
  };

  // Cálculos Totais
  const totalInvested = items.reduce((acc, item) => acc + (item.quantity * item.average_price), 0);
  const currentEquity = items.reduce((acc, item) => {
    const price = assetsData[item.ticker]?.price || item.average_price;
    return acc + (item.quantity * price);
  }, 0);
  const totalOpenProfit = currentEquity - totalInvested;
  
  // Lucro Realizado (Histórico)
  const totalRealizedProfit = historyItems.reduce((acc, item) => acc + item.profit, 0);

  return (
    <div className="flex min-h-screen bg-background-dark">
      <div className="hidden md:block"><Sidebar /></div>
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20">
        <Header />
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-3xl font-black text-white">Minha <span className="text-primary">Carteira</span></h2>
              <p className="text-slate-500 font-medium">Gestão de património e histórico de operações.</p>
            </motion.div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-background-dark px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 uppercase tracking-widest text-xs"
            >
              <Plus className="w-5 h-5" /> Adicionar Compra
            </button>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark relative overflow-hidden group">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <Briefcase className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Património Atual (Aberto)</span>
              </div>
              <h3 className="text-3xl font-mono font-black text-white">{formatBRL(currentEquity)}</h3>
              <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Investido: {formatBRL(totalInvested)}</p>
            </div>

            <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark relative overflow-hidden">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <TrendingUp className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Lucro Flutuante (Aberto)</span>
              </div>
              <h3 className={`text-3xl font-mono font-black ${totalOpenProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {totalOpenProfit >= 0 ? '+' : ''}{formatBRL(totalOpenProfit)}
              </h3>
              <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Ainda em operação</p>
            </div>

            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20">
              <div className="flex items-center gap-3 text-primary mb-2">
                <Wallet className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Lucro Realizado (Fechado)</span>
              </div>
              <h3 className={`text-3xl font-mono font-black ${totalRealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {totalRealizedProfit >= 0 ? '+' : ''}{formatBRL(totalRealizedProfit)}
              </h3>
              <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Dinheiro no bolso</p>
            </div>
          </div>

          {/* Separadores (Tabs) */}
          <div className="flex gap-2 p-1 bg-surface-dark rounded-xl border border-border-dark w-full max-w-md">
            <button 
              onClick={() => setActiveTab('open')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'open' ? 'bg-primary text-background-dark shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <PieChart className="w-4 h-4" /> Posições Abertas
            </button>
            <button 
              onClick={() => setActiveTab('closed')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'closed' ? 'bg-primary text-background-dark shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <History className="w-4 h-4" /> Histórico
            </button>
          </div>

          {/* Conteúdo das Tabs */}
          <div className="bg-surface-dark rounded-3xl border border-border-dark overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              
              {/* TAB: POSIÇÕES ABERTAS */}
              {activeTab === 'open' && (
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-background-dark/50 border-b border-border-dark">
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ativo</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Quantidade</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preço Médio</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preço Atual</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Lucro/Prejuízo</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={6} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                    ) : items.length === 0 ? (
                      <tr><td colSpan={6} className="p-20 text-center text-slate-500 font-bold uppercase text-xs tracking-widest">Nenhuma posição aberta.</td></tr>
                    ) : items.map((item) => {
                      const currentPrice = assetsData[item.ticker]?.price || item.average_price;
                      const itemProfit = (currentPrice - item.average_price) * item.quantity;
                      const itemProfitPercent = ((currentPrice / item.average_price) - 1) * 100;

                      return (
                        <tr key={item.id} className="border-b border-border-dark/50 hover:bg-white/5 transition-colors group">
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-background-dark border border-border-dark flex items-center justify-center font-black text-primary text-xs">
                                {item.ticker.charAt(0)}
                              </div>
                              <span className="font-black text-white">{item.ticker}</span>
                            </div>
                          </td>
                          <td className="p-5 text-center text-slate-300 font-mono font-bold">{item.quantity}</td>
                          <td className="p-5 text-slate-400 font-mono">{formatBRL(item.average_price)}</td>
                          <td className="p-5 text-white font-mono font-bold">{formatBRL(currentPrice)}</td>
                          <td className="p-5 text-right">
                            <div className={`font-black font-mono ${itemProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {itemProfit >= 0 ? '+' : ''}{formatBRL(itemProfit)}
                            </div>
                            <div className={`text-[10px] font-bold ${itemProfit >= 0 ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>
                              {itemProfitPercent.toFixed(2)}%
                            </div>
                          </td>
                          <td className="p-5 text-center flex items-center justify-center gap-2">
                            <button 
                              onClick={() => setAssetToClose(item)}
                              className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-background-dark rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                            >
                              Encerrar
                            </button>
                            <button 
                              onClick={() => setAssetToDelete({ id: item.id, ticker: item.ticker })}
                              className="p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors"
                              title="Remover sem registrar histórico"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* TAB: HISTÓRICO (LUCRO REALIZADO) */}
              {activeTab === 'closed' && (
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-background-dark/50 border-b border-border-dark">
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Fecho</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ativo</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Quantidade</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preço Compra</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preço Venda</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Lucro Realizado</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={7} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                    ) : historyItems.length === 0 ? (
                      <tr><td colSpan={7} className="p-20 text-center text-slate-500 font-bold uppercase text-xs tracking-widest">Nenhuma operação encerrada.</td></tr>
                    ) : historyItems.map((item) => (
                      <tr key={item.id} className="border-b border-border-dark/50 hover:bg-white/5 transition-colors group">
                        <td className="p-5 text-xs text-slate-400 font-mono">
                          {new Date(item.close_date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-5 font-black text-white">{item.ticker}</td>
                        <td className="p-5 text-center text-slate-300 font-mono font-bold">{item.quantity}</td>
                        <td className="p-5 text-slate-400 font-mono">{formatBRL(item.buy_price)}</td>
                        <td className="p-5 text-white font-mono font-bold">{formatBRL(item.sell_price)}</td>
                        <td className="p-5 text-right">
                          <div className={`flex justify-end items-center gap-2 font-black font-mono ${item.profit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {item.profit >= 0 ? <CheckCircle className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}
                            {item.profit >= 0 ? '+' : ''}{formatBRL(item.profit)}
                          </div>
                          <div className={`text-[10px] font-bold ${item.profit >= 0 ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>
                            {item.profit_percent.toFixed(2)}%
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <button 
                            onClick={() => setHistoryToDelete({ id: item.id, ticker: item.ticker })}
                            className="p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors"
                            title="Remover do histórico"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            </div>
          </div>
        </div>

        {/* Modal de Registro de Compra */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface-dark border border-border-dark rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Adicionar <span className="text-primary">Posição</span></h3>
                
                <form onSubmit={handleAddAsset} className="space-y-5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Ticker do Ativo</label>
                    <input required type="text" value={newAsset.ticker} onChange={e => setNewAsset({...newAsset, ticker: e.target.value})} className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white uppercase outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold" placeholder="Ex: PETR4" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Quantidade</label>
                      <input required type="number" step="1" min="1" value={newAsset.quantity} onChange={e => setNewAsset({...newAsset, quantity: e.target.value})} className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white font-mono outline-none focus:ring-2 focus:ring-primary/50 transition-all" placeholder="100" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Preço Médio (R$)</label>
                      <input required type="number" step="0.01" min="0.01" value={newAsset.price} onChange={e => setNewAsset({...newAsset, price: e.target.value})} className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white font-mono outline-none focus:ring-2 focus:ring-primary/50 transition-all" placeholder="32.50" />
                    </div>
                  </div>
                  <button disabled={isSaving} type="submit" className="w-full bg-primary text-background-dark font-black py-4 rounded-xl mt-6 uppercase tracking-widest text-xs hover:brightness-110 transition-all flex justify-center items-center gap-2">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {isSaving ? 'Salvando...' : 'Registar Compra'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de Encerrar Posição (Venda) */}
        <AnimatePresence>
          {assetToClose && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface-dark border border-border-dark rounded-3xl p-8 w-full max-w-sm shadow-2xl relative">
                <button onClick={() => setAssetToClose(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                <h3 className="text-xl font-black text-white mb-1 tracking-tight">Encerrar <span className="text-primary">{assetToClose.ticker}</span></h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Realizar Lucro/Prejuízo</p>
                
                <form onSubmit={handleClosePosition} className="space-y-5">
                  <div className="bg-background-dark border border-border-dark p-4 rounded-xl text-center mb-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Custo de Entrada</p>
                    <p className="text-lg font-mono text-slate-300">{formatBRL(assetToClose.average_price)}</p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Preço de Venda (R$)</label>
                    <input 
                      required type="number" step="0.01" min="0.01" 
                      value={closePrice} 
                      onChange={e => setClosePrice(e.target.value)} 
                      className="w-full bg-primary/10 border border-primary/30 rounded-xl py-4 px-4 text-white font-mono font-black text-lg outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center" 
                    />
                  </div>
                  
                  <button disabled={isClosing} type="submit" className="w-full bg-primary text-background-dark font-black py-4 rounded-xl mt-6 uppercase tracking-widest text-xs hover:brightness-110 transition-all flex justify-center items-center gap-2">
                    {isClosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {isClosing ? 'Processando...' : 'Confirmar Venda'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal Genérico de Exclusão (Para Erros/Testes) */}
        <AnimatePresence>
          {(assetToDelete || historyToDelete) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface-dark border border-border-dark rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center relative overflow-hidden">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-rose-500/20 shadow-inner">
                  <AlertTriangle className="w-8 h-8 text-rose-500" />
                </div>
                
                <h3 className="text-xl font-black text-white mb-2 tracking-tight">
                  Remover <span className="text-rose-500">{assetToDelete?.ticker || historyToDelete?.ticker}</span>?
                </h3>
                
                <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                  Tem certeza que deseja remover este registo? <br />
                  <span className="font-bold text-slate-300">Esta ação não poderá ser desfeita.</span>
                </p>

                <div className="flex gap-4">
                  <button 
                    onClick={() => { setAssetToDelete(null); setHistoryToDelete(null); }} 
                    disabled={isDeleting} 
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-300 bg-background-dark border border-border-dark hover:bg-white/5 transition-all text-xs uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={assetToDelete ? confirmDeleteAsset : confirmDeleteHistory} 
                    disabled={isDeleting} 
                    className="flex-1 py-3 px-4 rounded-xl font-black text-white bg-rose-500 hover:bg-rose-600 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {isDeleting ? 'Excluindo' : 'Remover'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

// Ícone X Fallback
function X(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  );
}