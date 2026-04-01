'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, ArrowRight, BrainCircuit, TrendingUp, TrendingDown, 
  Activity, ShieldAlert, LineChart as ChartIcon, RefreshCcw, AlertTriangle, 
  Scale, Lightbulb, Target, AlertCircle, Save, Loader2, X
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
    risk_scenario?: string; // Preparado para a nova API
  };
};

const formatCurrency = (value: number | undefined) => {
  if (value === undefined || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Tradutor Amigável para o Iniciante
const getFriendlyTerm = (rec: string) => {
  if (!rec) return 'Aguarde (Momento Indeciso)';
  if (rec.includes('Compra Forte')) return 'Ótima Oportunidade de Compra';
  if (rec.includes('Compra')) return 'Sinal de Compra (Tendência de Alta)';
  if (rec.includes('Venda Forte')) return 'Perigo (Forte Risco de Queda)';
  if (rec.includes('Venda')) return 'Sinal de Venda (Tendência de Baixa)';
  return 'Aguarde (Momento Indeciso)';
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
      if (assetJson && assetJson[ticker]) setAssetData(assetJson[ticker]);

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
        if (error.code === '23505') alert('Esta ação já está guardada nos seus favoritos.');
        else throw error;
      } else {
        router.push('/watchlist');
      }
    } catch (e: any) {
      alert('Erro de sistema ao guardar: ' + e.message);
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
            <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">A IA está a pensar...</h3>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500 animate-pulse">Lendo os gráficos de {ticker}</p>
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
            <h2 className="text-xl font-black text-white uppercase mb-2">Ops, algo falhou</h2>
            <p className="text-slate-400 text-sm max-w-md mb-8">
              A nossa IA não conseguiu ler os dados de <span className="text-white font-bold">{ticker}</span> neste momento. O mercado pode estar fechado ou o código da ação está incorreto.
            </p>
            <div className="flex gap-4">
              <button onClick={() => router.push('/dashboard')} className="px-6 py-3 bg-surface-dark border border-border-dark rounded-xl text-white font-bold hover:bg-white/5 transition-all text-xs uppercase tracking-widest flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar ao Início
              </button>
              <button onClick={fetchAllData} className="px-6 py-3 bg-primary text-background-dark rounded-xl font-black hover:brightness-110 transition-all text-xs uppercase tracking-widest flex items-center gap-2">
                <RefreshCcw className="w-4 h-4" /> Tentar Novamente
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const styles = getRecommendationStyles(data.analysis.recommendation);
  const friendlyTerm = getFriendlyTerm(data.analysis.recommendation);
  const currentRR = calculateRR();

  return (
    <div className="flex min-h-screen bg-background-dark">
      <div className="hidden md:block"><Sidebar /></div>
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full pb-20 space-y-6">
          
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          {/* Lembrete Amigável em vez de Aviso Fiduciário Agressivo */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-start gap-3"
          >
            <Lightbulb className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-300">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Lembrete de Ouro</h4>
              <p className="text-xs leading-relaxed font-medium">
                A Inteligência Artificial é uma excelente assistente para ler gráficos matemáticos em segundos, mas <strong>ninguém prevê o futuro</strong>. Considere as informações abaixo como um estudo, e nunca invista dinheiro que faça falta no seu dia-a-dia.
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
                <p className="text-slate-400 font-medium uppercase tracking-widest text-xs mt-1">Análise Simplificada por IA</p>
              </div>
            </div>
            {assetData && (
              <div className="text-left md:text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Preço Atual</p>
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

          {/* Gráfico Visual simplificado */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-dark p-6 rounded-3xl border border-border-dark h-[350px] w-full relative group">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <ChartIcon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Histórico de Preços (Último Mês)</span>
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
                </AreaChart>
             </ResponsiveContainer>
          </motion.div>

          {/* O Relatório da IA desenhado para Iniciantes */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface-dark rounded-3xl border border-primary/20 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-primary to-emerald-500" />
            <div className="p-6 md:p-8 space-y-8">
              
              {/* O Veredicto */}
              <div className={`flex flex-col md:flex-row md:items-center gap-4 p-6 rounded-2xl border ${styles.border} ${styles.bg}`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 bg-background-dark/50 ${styles.text}`}>
                  {styles.icon}
                </div>
                <div>
                  <h2 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">O Veredicto da IA:</h2>
                  <h3 className={`text-xl md:text-2xl font-black uppercase tracking-tight ${styles.text}`}>{friendlyTerm}</h3>
                </div>
              </div>

              {/* Explicações (Por que me importar? & Qual o risco?) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-background-dark/80 p-6 rounded-2xl border border-border-dark relative">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-primary" />
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">O que está a acontecer?</h4>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                    {data.analysis.justification}
                  </p>
                </div>

                <div className="bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10 relative">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                    <h4 className="text-sm font-black text-rose-400 uppercase tracking-widest">Qual é o Pior Cenário?</h4>
                  </div>
                  <p className="text-rose-200/70 text-sm leading-relaxed whitespace-pre-wrap">
                    {data.analysis.risk_scenario || "Para evitar grandes perdas caso o mercado vire contra você, é essencial usar o valor de 'Stop' (Saída de Segurança) sugerido abaixo."}
                  </p>
                </div>
              </div>

              {/* Indicadores Traduzidos */}
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Os Números por trás da decisão
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-background-dark p-4 rounded-xl border border-border-dark text-center md:text-left">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Termômetro (RSI)</p>
                    <p className="text-lg font-mono font-black text-white">{data.indicators.rsi?.toFixed(1) || 'N/A'}</p>
                  </div>
                  <div className="bg-background-dark p-4 rounded-xl border border-border-dark text-center md:text-left">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Força Atual (MACD)</p>
                    <p className={`text-lg font-mono font-black ${data.indicators.macd && data.indicators.macd > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {data.indicators.macd?.toFixed(3) || '0.000'}
                    </p>
                  </div>
                  <div className="bg-background-dark p-4 rounded-xl border border-border-dark text-center md:text-left">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Média de 50 Dias</p>
                    <p className="text-lg font-mono font-black text-white">{formatCurrency(data.indicators.sma50 || undefined)}</p>
                  </div>
                  <div className="bg-background-dark p-4 rounded-xl border border-border-dark text-center md:text-left">
                    <p className="text-[10px] text-primary font-bold uppercase mb-1" title="Agitação média do preço por dia">Agitação (ATR)</p>
                    <p className="text-lg font-mono font-black text-primary">{formatCurrency(data.indicators.atr || undefined)}</p>
                  </div>
                </div>
              </div>

              {/* Plano Prático */}
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" /> Sugestão Prática de Compra
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-background-dark p-5 rounded-2xl border border-border-dark shadow-inner">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Preço ideal para comprar</p>
                    <p className="text-2xl font-black text-primary">{formatCurrency(data.analysis.entry_price)}</p>
                  </div>
                  <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10 shadow-inner">
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Onde Vender com Lucro</p>
                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(data.analysis.take_profit)}</p>
                  </div>
                  <div className="bg-rose-500/5 p-5 rounded-2xl border border-rose-500/10 shadow-inner">
                    <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mb-1">Onde sair para evitar dor (Stop)</p>
                    <p className="text-2xl font-black text-rose-400">{formatCurrency(data.analysis.stop_loss)}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-primary hover:brightness-110 text-background-dark font-black py-4 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group uppercase tracking-widest text-xs"
              >
                <Save className="w-4 h-4" />
                <span>Salvar esta oportunidade</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* Modal Amigável */}
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
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">Simular & Guardar: <span className="text-primary">{ticker}</span></h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ajuste se necessário</p>
                    </div>
                  </div>

                  {/* Mostrador Risco/Retorno Humano */}
                  <div className="bg-background-dark p-4 rounded-xl border border-border-dark mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vale a pena?</p>
                      <p className="text-xs text-slate-400 mt-0.5">Potencial de Lucro vs Risco de Perda</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-black font-mono ${parseFloat(currentRR) >= 2 ? 'text-emerald-400' : parseFloat(currentRR) >= 1 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {currentRR}x
                      </span>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">De Retorno</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 block">Vou comprar por (R$)</label>
                      <input 
                        type="number" step="0.01"
                        value={tradeValues.entry}
                        onChange={(e) => setTradeValues({...tradeValues, entry: e.target.value})}
                        className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white font-mono focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest ml-1 block">Sair se cair para (R$)</label>
                        <input 
                          type="number" step="0.01"
                          value={tradeValues.stop}
                          onChange={(e) => setTradeValues({...tradeValues, stop: e.target.value})}
                          className="w-full bg-rose-500/5 border border-rose-500/20 rounded-xl py-3 px-4 text-rose-200 font-mono focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest ml-1 block">Lucro desejado em (R$)</label>
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
                      <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Guardar nos Meus Alertas</>
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