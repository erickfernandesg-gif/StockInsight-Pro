'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, ArrowRight, CheckCircle, Info, Loader2, XCircle, Save, X, 
  BrainCircuit, TrendingUp, TrendingDown, Activity, Target, ShieldAlert, 
  DollarSign, LineChart as ChartIcon, RefreshCcw, AlertTriangle, Scale
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';

type AnalysisData = {
  ticker: string;
  chartData: any[];
  indicators: {
    rsi: number | null;
    sma50: number | null;
    macd: number | null;
    atr: number | null;
  };
  analysis: {
    recommendation: string;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    justification: string;
  };
};

// Função Utilitária para Formatação BRL
const formatCurrency = (value: number | undefined) => {
  if (value === undefined || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Tradutor Institucional: Converte termos amadores em jargão de Hedge Fund
const getInstitutionalTerm = (rec: string) => {
  if (!rec) return 'Aguardar Confirmação (Neutro)';
  if (rec.includes('Compra Forte')) return 'Forte Assimetria Positiva';
  if (rec.includes('Compra')) return 'Viés Direcional de Alta';
  if (rec.includes('Venda Forte')) return 'Forte Assimetria Negativa';
  if (rec.includes('Venda')) return 'Viés Direcional de Baixa';
  return 'Aguardar Confirmação (Neutro)';
};

const getRecommendationStyles = (recommendation: string) => {
  if (recommendation?.includes('Compra Forte')) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: <TrendingUp className="w-6 h-6" /> };
  if (recommendation?.includes('Compra')) return { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-300', icon: <TrendingUp className="w-6 h-6" /> };
  if (recommendation?.includes('Venda')) return { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', icon: <TrendingDown className="w-6 h-6" /> };
  return { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', icon: <Activity className="w-6 h-6" /> };
};

export default function AnalysisPage() {
  const params = useParams();
  const ticker = (params.ticker as string).toUpperCase();
  const router = useRouter();
  const supabase = createClient();

  const [data, setData] = useState<AnalysisData | null>(null);
  const [assetData, setAssetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tradeValues, setTradeValues] = useState({ entry: '', stop: '', target: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Calculador Dinâmico de Risco/Retorno
  const calculateRR = () => {
    const e = parseFloat(tradeValues.entry.replace(',', '.'));
    const s = parseFloat(tradeValues.stop.replace(',', '.'));
    const t = parseFloat(tradeValues.target.replace(',', '.'));
    
    if (isNaN(e) || isNaN(s) || isNaN(t)) return 'N/A';
    
    const isLong = t > e;
    const risk = isLong ? e - s : s - e;
    const reward = isLong ? t - e : e - t;

    if (risk <= 0) return 'Inválido';
    return (reward / risk).toFixed(2);
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const resAsset = await fetch('/api/watchlist-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: [ticker] }),
      });
      const assetJson = await resAsset.json();
      if (assetJson && assetJson[ticker]) {
        setAssetData(assetJson[ticker]);
      }

      const resAi = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });
      const resultAi = await resAi.json();
      
      if (!resAi.ok) throw new Error(resultAi.error || 'Falha ao analisar o ativo');
      
      setData(resultAi);
      setTradeValues({
        entry: resultAi.analysis.entry_price?.toString() || '',
        stop: resultAi.analysis.stop_loss?.toString() || '',
        target: resultAi.analysis.take_profit?.toString() || ''
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ticker) fetchAllData();
  }, [ticker]);

  const handleSaveTrade = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { error } = await supabase.from('user_favorites').insert({
        user_id: user.id,
        ticker: ticker,
        entry_price: parseFloat(tradeValues.entry.replace(',', '.')),
        stop_loss: parseFloat(tradeValues.stop.replace(',', '.')),
        target_price: parseFloat(tradeValues.target.replace(',', '.')),
        status: 'active'
      });

      if (error) {
        if (error.code === '23505') alert('Este ativo já está monitorizado no seu Radar de Risco.');
        else throw error;
      } else {
        router.push('/watchlist');
      }
    } catch (e: any) {
      alert('Erro de sistema ao registar setup: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background-dark">
        <div className="hidden md:block"><Sidebar /></div>
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header />
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
              <BrainCircuit className="w-16 h-16 text-primary relative z-10 animate-bounce" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Motor Quantitativo Ativo</h3>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500 animate-pulse">Processando matriz de dados para {ticker}...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen bg-background-dark">
        <div className="hidden md:block"><Sidebar /></div>
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header />
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <ShieldAlert className="w-16 h-16 mb-4 text-rose-500 opacity-80" />
            <h2 className="text-xl font-black text-white uppercase mb-2">Anomalia de Processamento</h2>
            <p className="text-slate-400 text-sm max-w-md mb-8">
              O motor não conseguiu estabelecer um nível de confiança aceitável para o ativo <span className="text-white font-bold">{ticker}</span>. 
              Verifique a integridade do ticker ou aguarde atualização do fluxo de dados.
            </p>
            <div className="flex gap-4">
              <button onClick={() => router.push('/dashboard')} className="px-6 py-3 bg-surface-dark border border-border-dark rounded-xl text-white font-bold hover:bg-white/5 transition-all text-xs uppercase tracking-widest flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar ao Terminal
              </button>
              <button onClick={fetchAllData} className="px-6 py-3 bg-primary text-background-dark rounded-xl font-black hover:brightness-110 transition-all text-xs uppercase tracking-widest flex items-center gap-2">
                <RefreshCcw className="w-4 h-4" /> Recalcular Modelo
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const styles = getRecommendationStyles(data.analysis.recommendation);
  const institutionalTerm = getInstitutionalTerm(data.analysis.recommendation);
  const currentRR = calculateRR();

  return (
    <div className="flex min-h-screen bg-background-dark">
      <div className="hidden md:block"><Sidebar /></div>
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full pb-20 space-y-6">
          
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Terminal
          </button>

          {/* DISCLAIMER INSTITUCIONAL (Audit-Proof) */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-amber-500/90">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Aviso de Risco e Compliance Fiduciário</h4>
              <p className="text-[11px] leading-relaxed font-medium text-justify">
                Os relatórios gerados por este motor quantitativo baseiam-se em modelos probabilísticos. <strong>Não constituem recomendação de investimento, solicitação ou oferta de compra/venda de valores mobiliários.</strong> A performance passada não garante resultados futuros. A gestão de capital e a alocação de risco são de exclusiva responsabilidade do operador.
              </p>
            </div>
          </motion.div>

          {/* Header do Ativo */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-dark pb-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-surface-dark border border-border-dark flex items-center justify-center font-black text-2xl text-primary shadow-lg">
                {ticker.charAt(0)}
              </div>
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight">{ticker}</h1>
                <p className="text-slate-400 font-medium uppercase tracking-widest text-xs mt-1">Análise Técnica & Fluxo Institucional</p>
              </div>
            </div>
            {assetData && (
              <div className="text-left md:text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Cotação Base de Cálculo</p>
                <div className="flex items-baseline gap-3 justify-start md:justify-end">
                  <span className="text-3xl font-mono font-black text-white">{formatCurrency(assetData.price)}</span>
                  <span className={`flex items-center gap-1 text-sm font-bold ${assetData.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {assetData.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {assetData.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Gráfico de Performance */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-dark p-6 rounded-3xl border border-border-dark h-[400px] w-full relative group">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <ChartIcon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Histórico Recente vs SMA 50</span>
                </div>
             </div>
             
             <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={data.chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                    itemStyle={{ fontWeight: 'bold' }}
                    labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" name="Preço" />
                  <Line type="monotone" dataKey="sma50" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 5" dot={false} name="SMA 50" />
                </AreaChart>
             </ResponsiveContainer>
          </motion.div>

          {/* Painel do Robô Quantitativo */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface-dark rounded-3xl border border-primary/20 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-primary to-emerald-500" />
            <div className="p-6 md:p-8 space-y-8">
              
              <div className={`flex items-center gap-4 p-6 rounded-2xl border ${styles.border} ${styles.bg}`}>
                <div className={styles.text}>{styles.icon}</div>
                <div>
                  <h2 className={`text-xl md:text-2xl font-black uppercase tracking-widest ${styles.text}`}>{institutionalTerm}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Sinal Gerado via Modelagem Probabilística (AI)</p>
                </div>
              </div>

              {/* Tese Quantitativa Institucional */}
              <div className="bg-background-dark/50 p-6 rounded-2xl border border-border-dark relative">
                <div className="absolute -top-3 left-6 bg-surface-dark px-2 text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <BrainCircuit className="w-3 h-3" /> Relatório Quantitativo
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mt-2">
                  {data.analysis.justification}
                </p>
              </div>

              {/* Indicadores Técnicos */}
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Diagnóstico de Confluência
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-background-dark p-4 rounded-xl border border-border-dark">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Força Relativa (RSI)</p>
                    <p className="text-xl font-mono font-black text-white">{data.indicators.rsi?.toFixed(1) || 'N/A'}</p>
                  </div>
                  <div className="bg-background-dark p-4 rounded-xl border border-border-dark">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Divergência (MACD)</p>
                    <p className={`text-xl font-mono font-black ${data.indicators.macd && data.indicators.macd > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {data.indicators.macd?.toFixed(3) || '0.000'}
                    </p>
                  </div>
                  <div className="bg-background-dark p-4 rounded-xl border border-border-dark">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Tendência (SMA 50)</p>
                    <p className="text-xl font-mono font-black text-white">{formatCurrency(data.indicators.sma50 || undefined)}</p>
                  </div>
                  <div className="bg-background-dark p-4 rounded-xl border border-border-dark">
                    <p className="text-[10px] text-primary font-bold uppercase mb-1">Volatilidade (ATR)</p>
                    <p className="text-xl font-mono font-black text-primary">{formatCurrency(data.indicators.atr || undefined)}</p>
                  </div>
                </div>
              </div>

              {/* Trade Setup */}
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" /> Projeção de Parâmetros de Execução
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-background-dark p-5 rounded-2xl border border-border-dark shadow-inner">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Zona de Entrada</p>
                    <p className="text-2xl font-black text-primary">{formatCurrency(data.analysis.entry_price)}</p>
                  </div>
                  <div className="bg-rose-500/5 p-5 rounded-2xl border border-rose-500/10 shadow-inner">
                    <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mb-1">Stop Técnico (Perda Max)</p>
                    <p className="text-2xl font-black text-rose-400">{formatCurrency(data.analysis.stop_loss)}</p>
                  </div>
                  <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10 shadow-inner">
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Alvo Projetado</p>
                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(data.analysis.take_profit)}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-primary hover:brightness-110 text-background-dark font-black py-4 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group uppercase tracking-widest text-xs"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Configurar Plano de Gestão de Risco</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* Modal de Confirmação Institucional */}
          <AnimatePresence>
            {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/90 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-surface-dark border border-border-dark w-full max-w-lg rounded-3xl p-8 shadow-2xl relative mx-4"
                >
                  <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                      <Scale className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">Validar Risco: <span className="text-primary">{ticker}</span></h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ajuste os parâmetros operacionais</p>
                    </div>
                  </div>

                  {/* Mostrador do Risco/Retorno */}
                  <div className="bg-background-dark p-4 rounded-xl border border-border-dark mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rácio Risco/Retorno (R:R)</p>
                      <p className="text-xs text-slate-400 mt-0.5">O que você arrisca vs O que pode ganhar</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-black font-mono ${parseFloat(currentRR) >= 2 ? 'text-emerald-400' : parseFloat(currentRR) >= 1 ? 'text-amber-400' : 'text-rose-400'}`}>
                        1 : {currentRR}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 block">Entrada Planejada (R$)</label>
                      <input 
                        type="number" step="0.01"
                        value={tradeValues.entry}
                        onChange={(e) => setTradeValues({...tradeValues, entry: e.target.value})}
                        className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white font-mono focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest ml-1 block">Stop Técnico Máximo (R$)</label>
                        <input 
                          type="number" step="0.01"
                          value={tradeValues.stop}
                          onChange={(e) => setTradeValues({...tradeValues, stop: e.target.value})}
                          className="w-full bg-rose-500/5 border border-rose-500/20 rounded-xl py-3 px-4 text-rose-200 font-mono focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest ml-1 block">Alvo Primário (R$)</label>
                        <input 
                          type="number" step="0.01"
                          value={tradeValues.target}
                          onChange={(e) => setTradeValues({...tradeValues, target: e.target.value})}
                          className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 px-4 text-emerald-200 font-mono focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveTrade}
                    disabled={isSaving || currentRR === 'N/A' || currentRR === 'Inválido'}
                    className="w-full mt-8 bg-primary hover:bg-primary/90 text-background-dark font-black py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest text-xs transition-all shadow-lg shadow-primary/10"
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processando Inserção...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Registrar no Monitor de Risco</>
                    )}
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}