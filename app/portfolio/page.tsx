'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Wallet, TrendingUp, Loader2, Trash2, PieChart, 
  Briefcase, History, CheckCircle, XCircle, AlertTriangle, Lightbulb, Target, Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PortfolioItem {
  id: string;
  ticker: string;
  quantity: number;
  average_price: number;
  purchase_date?: string;
  target_percent?: number;
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
  
  // Modais Básicos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({ ticker: '', quantity: '', price: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  const [assetToClose, setAssetToClose] = useState<PortfolioItem | null>(null);
  const [closePrice, setClosePrice] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const [assetToDelete, setAssetToDelete] = useState<{ id: string, ticker: string } | null>(null);
  const [historyToDelete, setHistoryToDelete] = useState<{ id: string, ticker: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Assistente Inteligente
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false); // NOVO ESTADO: Controla a UX do modal

  // UX: Feedback visual ao gravar a Meta
  const [savingTargetId, setSavingTargetId] = useState<string | null>(null);
  
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

    const { data: openData } = await supabase.from('user_portfolio').select('*').eq('user_id', user.id);
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

  useEffect(() => {
    if (assetToClose) {
      const currentPrice = assetsData[assetToClose.ticker]?.price;
      setClosePrice(currentPrice ? currentPrice.toFixed(2) : assetToClose.average_price.toFixed(2));
    }
  }, [assetToClose, assetsData]);

  const handleUpdateTarget = async (id: string, newTarget: string) => {
    const val = parseFloat(newTarget);
    if (isNaN(val) || val < 0) return;

    setSavingTargetId(id); 
    setItems(prev => prev.map(item => item.id === id ? { ...item, target_percent: val } : item));
    
    await supabase.from('user_portfolio').update({ target_percent: val }).eq('id', id);
    setTimeout(() => setSavingTargetId(null), 1500); 
  };

  // Reseta o estado quando o utilizador escreve um novo valor
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContributionAmount(e.target.value);
    setHasCalculated(false);
    setSuggestions([]);
  };

  const handleCalculateSmartContribution = (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // Evita o reload da página se acionado por "Enter"
    
    const cash = parseFloat(contributionAmount.replace(',', '.'));
    if (isNaN(cash) || cash <= 0) return;

    const totalTargetSet = items.reduce((acc, item) => acc + (item.target_percent || 0), 0);
    if (totalTargetSet === 0) {
      alert("Defina a Meta (%) dos seus ativos na tabela antes de usar o assistente.");
      return;
    }

    const currentTotalEquity = items.reduce((acc, item) => {
      const price = assetsData[item.ticker]?.price || item.average_price;
      return acc + (item.quantity * price);
    }, 0);

    const newTargetEquity = currentTotalEquity + cash;
    let localSuggestions = [];

    for (const item of items) {
      const targetPct = item.target_percent || 0;
      if (targetPct <= 0) continue;

      const price = assetsData[item.ticker]?.price || item.average_price;
      const currentVal = item.quantity * price;
      
      const targetVal = newTargetEquity * (targetPct / 100);
      const deficit = targetVal - currentVal;

      if (deficit >= price) {
        const sharesToBuy = Math.floor(deficit / price);
        const cost = sharesToBuy * price;
        
        localSuggestions.push({
          ticker: item.ticker,
          shares: sharesToBuy,
          price: price,
          cost: cost,
          deficit: deficit
        });
      }
    }

    localSuggestions.sort((a, b) => b.deficit - a.deficit);
    setSuggestions(localSuggestions);
    setHasCalculated(true); // Marca que o cálculo foi feito para mudar a UI
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const tickerToAdd = newAsset.ticker.toUpperCase().trim();
    const quantityToAdd = parseFloat(newAsset.quantity);
    const pricePaid = parseFloat(newAsset.price.replace(',', '.'));

    const { data: existingAsset } = await supabase.from('user_portfolio').select('*').eq('user_id', user.id).eq('ticker', tickerToAdd).maybeSingle();

    if (existingAsset) {
      const totalInvestedBefore = existingAsset.quantity * existingAsset.average_price;
      const newInvestmentAmount = quantityToAdd * pricePaid;
      const newTotalQuantity = existingAsset.quantity + quantityToAdd;
      const newAveragePrice = (totalInvestedBefore + newInvestmentAmount) / newTotalQuantity;

      await supabase.from('user_portfolio').update({
        quantity: newTotalQuantity,
        average_price: newAveragePrice,
        purchase_date: new Date().toISOString()
      }).eq('id', existingAsset.id);
    } else {
      await supabase.from('user_portfolio').insert({
        user_id: user.id,
        ticker: tickerToAdd,
        quantity: quantityToAdd,
        average_price: pricePaid
      });
    }
    
    setIsModalOpen(false);
    setNewAsset({ ticker: '', quantity: '', price: '' });
    fetchPortfolio();
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

    await supabase.from('trade_history').insert({
      user_id: user.id,
      ticker: assetToClose.ticker,
      quantity: assetToClose.quantity,
      buy_price: assetToClose.average_price,
      sell_price: sellPriceNum,
      profit: profit,
      profit_percent: profitPercent,
      purchase_date: assetToClose.purchase_date || new Date().toISOString()
    });

    await supabase.from('user_portfolio').delete().eq('id', assetToClose.id);
    setAssetToClose(null);
    fetchPortfolio();
    setIsClosing(false);
  };

  const confirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    setIsDeleting(true);
    await supabase.from('user_portfolio').delete().eq('id', assetToDelete.id);
    setAssetToDelete(null);
    fetchPortfolio();
    setIsDeleting(false);
  };

  const confirmDeleteHistory = async () => {
    if (!historyToDelete) return;
    setIsDeleting(true);
    await supabase.from('trade_history').delete().eq('id', historyToDelete.id);
    setHistoryToDelete(null);
    fetchPortfolio();
    setIsDeleting(false);
  };

  const totalInvested = items.reduce((acc, item) => acc + (item.quantity * item.average_price), 0);
  const currentEquity = items.reduce((acc, item) => {
    const price = assetsData[item.ticker]?.price || item.average_price;
    return acc + (item.quantity * price);
  }, 0);
  const totalOpenProfit = currentEquity - totalInvested;
  const totalRealizedProfit = historyItems.reduce((acc, item) => acc + item.profit, 0);
  const totalTargetConfigured = items.reduce((acc, item) => acc + (item.target_percent || 0), 0);

  return (
    <div className="flex min-h-screen bg-background-dark">
      <div className="hidden md:block"><Sidebar /></div>
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20">
        <Header />
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
          
          {/* Topo: Títulos e Botões */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-3xl font-black text-white">Minha <span className="text-primary">Carteira</span></h2>
              <p className="text-slate-500 font-medium">Gestão inteligente do seu património.</p>
            </motion.div>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => { setIsAssistantOpen(true); setHasCalculated(false); setContributionAmount(''); setSuggestions([]); }}
                className="bg-indigo-600/10 text-indigo-400 px-5 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest text-xs border border-indigo-500/30"
                title="Deixe o sistema calcular suas próximas compras"
              >
                <Lightbulb className="w-5 h-5" /> Aporte Inteligente
              </button>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-primary text-background-dark px-5 py-3 rounded-xl font-black flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 uppercase tracking-widest text-xs"
              >
                <Plus className="w-5 h-5" /> Adicionar Compra
              </button>
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark relative overflow-hidden group">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <Briefcase className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Património Atual</span>
              </div>
              <h3 className="text-3xl font-mono font-black text-white">{formatBRL(currentEquity)}</h3>
              <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Investido: {formatBRL(totalInvested)}</p>
            </div>

            <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark relative overflow-hidden">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <TrendingUp className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Lucro Flutuante</span>
              </div>
              <h3 className={`text-3xl font-mono font-black ${totalOpenProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {totalOpenProfit >= 0 ? '+' : ''}{formatBRL(totalOpenProfit)}
              </h3>
              <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Em operações abertas</p>
            </div>

            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20">
              <div className="flex items-center gap-3 text-primary mb-2">
                <Wallet className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Lucro Realizado</span>
              </div>
              <h3 className={`text-3xl font-mono font-black ${totalRealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {totalRealizedProfit >= 0 ? '+' : ''}{formatBRL(totalRealizedProfit)}
              </h3>
              <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Dinheiro garantido</p>
            </div>
          </div>

          {/* Separadores de Tab */}
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
              <History className="w-4 h-4" /> Histórico de Vendas
            </button>
          </div>

          {/* Área da Tabela */}
          <div className="bg-surface-dark rounded-3xl border border-border-dark overflow-hidden shadow-lg">
            
            {activeTab === 'open' && (
              <div className="p-1">
                {items.length > 0 && totalTargetConfigured !== 100 && (
                   <div className="bg-indigo-500/10 border border-indigo-500/20 m-4 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4">
                     <div className="bg-indigo-500/20 p-3 rounded-xl hidden md:block">
                       <Lightbulb className="w-6 h-6 text-indigo-400" />
                     </div>
                     <div className="flex-1">
                       <h4 className="text-white font-bold mb-1 text-sm">Prepare a sua Carteira Inteligente</h4>
                       <p className="text-slate-400 text-xs leading-relaxed">
                         Para que o <strong className="text-indigo-300">Aporte Inteligente</strong> saiba exatamente o que sugerir, defina a fatia ideal (Meta %) para cada ativo abaixo. A soma total precisa ser de exatos 100%.
                       </p>
                     </div>
                     <div className="bg-background-dark px-4 py-2 rounded-lg border border-border-dark text-center min-w-[100px]">
                       <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Atual</span>
                       <span className={`text-lg font-black font-mono ${totalTargetConfigured > 100 ? 'text-rose-400' : 'text-indigo-400'}`}>
                         {totalTargetConfigured}%
                       </span>
                     </div>
                   </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[950px]">
                    <thead>
                      <tr className="bg-background-dark/30 border-y border-border-dark">
                        <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ativo</th>
                        <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center" title="Qual porcentagem da sua carteira deve ser desta ação?">Meta Ideal (%)</th>
                        <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Quantidade</th>
                        <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preço Médio</th>
                        <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preço Atual</th>
                        <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Lucro/Prejuízo</th>
                        <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Gerir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr><td colSpan={7} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                      ) : items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-16 text-center">
                            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                              <div className="w-16 h-16 bg-background-dark border border-border-dark rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <Briefcase className="w-8 h-8 text-slate-600" />
                              </div>
                              <h3 className="text-white font-black text-lg mb-2">A sua carteira está vazia</h3>
                              <p className="text-slate-500 text-xs mb-6 leading-relaxed">
                                Registe a sua primeira compra para começar a acompanhar o seu património e os seus lucros automaticamente.
                              </p>
                              <button 
                                onClick={() => setIsModalOpen(true)} 
                                className="bg-primary/10 text-primary px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-background-dark transition-all border border-primary/20"
                              >
                                Adicionar Primeira Compra
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : items.map((item) => {
                        const currentPrice = assetsData[item.ticker]?.price || item.average_price;
                        const itemProfit = (currentPrice - item.average_price) * item.quantity;
                        const itemProfitPercent = ((currentPrice / item.average_price) - 1) * 100;

                        return (
                          <tr key={item.id} className="border-b border-border-dark/50 hover:bg-white/5 transition-colors group">
                            <td className="p-5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-background-dark border border-border-dark flex items-center justify-center font-black text-primary text-sm shadow-sm">
                                  {item.ticker.substring(0, 2)}
                                </div>
                                <div>
                                  <span className="font-black text-white block">{item.ticker}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="relative w-20">
                                  <input 
                                    type="number" 
                                    min="0" max="100" 
                                    defaultValue={item.target_percent || 0}
                                    onBlur={(e) => handleUpdateTarget(item.id, e.target.value)}
                                    className="w-full bg-background-dark border border-border-dark rounded-lg py-2 px-2 pr-6 text-white font-mono text-center outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                                    title="Clique fora para guardar"
                                  />
                                  <span className="absolute right-2 top-2 text-slate-500 text-xs font-bold">%</span>
                                </div>
                                <div className="w-4 h-4 flex items-center justify-center">
                                  <AnimatePresence>
                                    {savingTargetId === item.id && (
                                      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
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
                                Vender
                              </button>
                              <button 
                                onClick={() => setAssetToDelete({ id: item.id, ticker: item.ticker })}
                                className="p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors"
                                title="Excluir registo (Apagar dado)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: HISTÓRICO */}
            {activeTab === 'closed' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-background-dark/30 border-b border-border-dark">
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data da Venda</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ativo</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Quantidade</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preço Compra</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preço Venda</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Resultado Final</th>
                      <th className="p-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Gerir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={7} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                    ) : historyItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-16 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-500">
                            <History className="w-10 h-10 mb-3 opacity-50" />
                            <p className="text-sm font-medium">Nenhuma operação de venda finalizada.</p>
                          </div>
                        </td>
                      </tr>
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
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODAL 1: ASSISTENTE DE APORTE INTELIGENTE (UX Melhorada)  */}
        {/* ========================================================= */}
        <AnimatePresence>
          {isAssistantOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface-dark border border-border-dark rounded-3xl p-8 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => { setIsAssistantOpen(false); setSuggestions([]); setContributionAmount(''); setHasCalculated(false); }} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-inner shrink-0">
                    <Lightbulb className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Aporte Inteligente</h3>
                    <p className="text-xs font-medium text-slate-400 mt-1">Descubra automaticamente o que comprar para manter a sua carteira equilibrada.</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* UX: Envolvido em <form> para suportar a tecla "Enter" naturalmente */}
                  <form onSubmit={handleCalculateSmartContribution} className="bg-background-dark p-5 rounded-2xl border border-border-dark">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-3">Valor disponível para investir (R$)</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="number" step="0.01" min="1" 
                        value={contributionAmount} 
                        onChange={handleAmountChange} 
                        className="flex-1 bg-surface-dark border border-border-dark rounded-xl px-4 py-3 text-white font-mono font-black text-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600" 
                        placeholder="Ex: 500.00" 
                        autoFocus
                      />
                      <button 
                        type="submit"
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        disabled={!contributionAmount}
                      >
                        Calcular
                      </button>
                    </div>
                  </form>

                  {/* UX: Estado 1 - Bem-vindo (Nunca clicou em calcular) */}
                  {!hasCalculated && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-6 mt-4">
                      <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Info className="w-4 h-4 text-indigo-400"/> Como funciona?</h4>
                      <ul className="text-slate-400 text-sm space-y-4">
                        <li className="flex gap-3 items-start">
                          <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 rounded-md flex items-center justify-center font-black shrink-0 text-xs">1</span> 
                          <span>Digite o valor que você tem disponível para investir hoje.</span>
                        </li>
                        <li className="flex gap-3 items-start">
                          <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 rounded-md flex items-center justify-center font-black shrink-0 text-xs">2</span> 
                          <span>O sistema cruza esse valor com as cotações em tempo real e com as Metas (%) que você definiu na tabela.</span>
                        </li>
                        <li className="flex gap-3 items-start">
                          <span className="bg-indigo-500/20 text-indigo-400 w-6 h-6 rounded-md flex items-center justify-center font-black shrink-0 text-xs">3</span> 
                          <span>Receba a lista exata de quais ações comprar. <strong className="text-white">Zero achismo.</strong></span>
                        </li>
                      </ul>
                    </motion.div>
                  )}

                  {/* UX: Estado 2 - Sucesso (Calculou e achou o que comprar) */}
                  {hasCalculated && suggestions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mt-4 pt-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-400" /> O que deve comprar:
                      </h4>
                      {suggestions.map((sug, i) => (
                        <div key={i} className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-xl flex justify-between items-center group hover:bg-indigo-500/10 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-lg">
                              {sug.shares}x
                            </div>
                            <div>
                              <span className="font-black text-white text-lg block">{sug.ticker}</span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cotação: {formatBRL(sug.price)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-indigo-400 block text-lg">{formatBRL(sug.cost)}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custo Total</span>
                          </div>
                        </div>
                      ))}
                      
                      <div className="bg-surface-dark p-4 rounded-xl border border-border-dark mt-4">
                         <p className="text-xs text-slate-400 leading-relaxed text-center">
                           Compre as quantidades indicadas na sua corretora e depois não se esqueça de clicar em <strong>"Adicionar Compra"</strong> na tabela.
                         </p>
                      </div>
                    </motion.div>
                  )}

                  {/* UX: Estado 3 - Sem Resultados Emocionalmente Inteligente */}
                  {hasCalculated && suggestions.length === 0 && contributionAmount && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-6 bg-surface-dark rounded-xl border border-border-dark mt-4">
                      <div className="w-12 h-12 bg-background-dark border border-border-dark rounded-full flex items-center justify-center mx-auto mb-4">
                        <Wallet className="w-6 h-6 text-slate-500" />
                      </div>
                      <h4 className="text-white font-bold mb-2">Nenhuma compra sugerida</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        Com os <strong className="text-white">{formatBRL(parseFloat(contributionAmount.replace(',', '.')))}</strong> simulados, não é possível comprar nem 1 ação inteira dos ativos que estão defasados. <br/><br/>
                        Sua carteira está bem equilibrada. Tente simular um valor maior no próximo mês!
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: REGISTRO DE COMPRA */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface-dark border border-border-dark rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Registar <span className="text-primary">Compra</span></h3>
                
                <form onSubmit={handleAddAsset} className="space-y-5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Qual ação comprou?</label>
                    <input required type="text" value={newAsset.ticker} onChange={e => setNewAsset({...newAsset, ticker: e.target.value})} className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white uppercase outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold" placeholder="Ex: PETR4" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Quantidade</label>
                      <input required type="number" step="1" min="1" value={newAsset.quantity} onChange={e => setNewAsset({...newAsset, quantity: e.target.value})} className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white font-mono outline-none focus:ring-2 focus:ring-primary/50 transition-all" placeholder="Ex: 100" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Preço Pago (R$)</label>
                      <input required type="number" step="0.01" min="0.01" value={newAsset.price} onChange={e => setNewAsset({...newAsset, price: e.target.value})} className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white font-mono outline-none focus:ring-2 focus:ring-primary/50 transition-all" placeholder="Ex: 32.50" />
                    </div>
                  </div>
                  <button disabled={isSaving} type="submit" className="w-full bg-primary text-background-dark font-black py-4 rounded-xl mt-6 uppercase tracking-widest text-xs hover:brightness-110 transition-all flex justify-center items-center gap-2">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {isSaving ? 'Guardando...' : 'Salvar na Carteira'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 3: VENDA (ENCERRAR POSIÇÃO) */}
        <AnimatePresence>
          {assetToClose && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface-dark border border-border-dark rounded-3xl p-8 w-full max-w-sm shadow-2xl relative">
                <button onClick={() => setAssetToClose(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                <h3 className="text-xl font-black text-white mb-1 tracking-tight">Vender <span className="text-primary">{assetToClose.ticker}</span></h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Registar venda e lucro final</p>
                
                <form onSubmit={handleClosePosition} className="space-y-5">
                  <div className="bg-background-dark border border-border-dark p-4 rounded-xl text-center mb-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Custo Médio de Entrada</p>
                    <p className="text-lg font-mono text-slate-300">{formatBRL(assetToClose.average_price)}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-2">Por quanto vendeu cada ação? (R$)</label>
                    <input required type="number" step="0.01" min="0.01" value={closePrice} onChange={e => setClosePrice(e.target.value)} className="w-full bg-primary/10 border border-primary/30 rounded-xl py-4 px-4 text-white font-mono font-black text-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center" />
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

        {/* MODAL 4: EXCLUSÃO DE ERROS */}
        <AnimatePresence>
          {(assetToDelete || historyToDelete) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface-dark border border-border-dark rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center relative overflow-hidden">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-rose-500/20 shadow-inner">
                  <AlertTriangle className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-white mb-2 tracking-tight">Apagar Registo de <span className="text-rose-500">{assetToDelete?.ticker || historyToDelete?.ticker}</span>?</h3>
                <p className="text-sm text-slate-400 mb-8 leading-relaxed">Isto serve apenas se você registou uma compra errada. <br /><span className="font-bold text-slate-300">Esta ação apagará o dado para sempre.</span></p>
                <div className="flex gap-4">
                  <button onClick={() => { setAssetToDelete(null); setHistoryToDelete(null); }} disabled={isDeleting} className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-300 bg-background-dark border border-border-dark hover:bg-white/5 transition-all text-xs uppercase tracking-widest">Cancelar</button>
                  <button onClick={assetToDelete ? confirmDeleteAsset : confirmDeleteHistory} disabled={isDeleting} className="flex-1 py-3 px-4 rounded-xl font-black text-white bg-rose-500 hover:bg-rose-600 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 disabled:opacity-50">
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {isDeleting ? 'Apagando' : 'Apagar'}
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