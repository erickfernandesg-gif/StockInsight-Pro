import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Garante que a rota seja sempre processada no servidor (evita erro de prerender)
export const dynamic = 'force-dynamic';

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos em milissegundos

export async function GET() {
  const supabase = await createClient();

  try {
    // ========================================================================
    // 1. TENTA LER DO CACHE PRIMEIRO (ECONOMIA DE API)
    // ========================================================================
    const { data: cacheRecord, error: cacheError } = await supabase
      .from('market_cache')
      .select('data, updated_at')
      .eq('id', 'market_summary')
      .single();

    if (cacheRecord && !cacheError) {
      const lastUpdated = new Date(cacheRecord.updated_at).getTime();
      const now = new Date().getTime();

      // Se o cache for válido (menos de 15 minutos), retorna ele instantaneamente
      if (now - lastUpdated < CACHE_DURATION_MS) {
        console.log('⚡ Cache HIT: Retornando dados do Market pelo Supabase');
        return NextResponse.json(cacheRecord.data);
      }
    }

    // ========================================================================
    // 2. SE O CACHE ESTIVER VAZIO OU EXPIRADO, BUSCA NAS APIs
    // ========================================================================
    console.log('🔄 Cache MISS ou Expirado. Buscando dados frescos nas APIs...');
    const token = process.env.BRAPI_TOKEN;
    
    if (!token) {
      console.warn('⚠️ BRAPI_TOKEN não encontrado. Ibovespa será retornado com valores zerados.');
    }

    // Execução paralela para performance máxima e isolamento de falhas
    const [ibovResult, dollarBrapiResult, dollarAwesomeResult, selicResult] = await Promise.allSettled([
      // Busca Ibovespa na Brapi (requisição individual)
      token 
        ? fetch(`https://brapi.dev/api/quote/^BVSP?token=${token}`, { next: { revalidate: 60 } }).then(res => res.json())
        : Promise.resolve(null),
      
      // Busca Dólar na Brapi (requisição individual)
      token
        ? fetch(`https://brapi.dev/api/quote/USDBRL=X?token=${token}`, { next: { revalidate: 60 } }).then(res => res.json())
        : Promise.resolve(null),

      // AwesomeAPI como fallback robusto para o Dólar
      fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', { 
        next: { revalidate: 60 },
        headers: { 'User-Agent': 'StockInsightPro/1.0' } 
      }).then(res => res.ok ? res.json() : Promise.reject('AwesomeAPI offline')),

      // Busca SELIC
      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json', { next: { revalidate: 3600 } }).then(res => res.json())
    ]);

    let ibov = { value: 0, change: 0, high: 0, low: 0 };
    let dollar = { value: 0, change: 0, high: 0, low: 0 };

    // Processamento Ibovespa (Fonte Principal: Brapi)
    if (ibovResult.status === 'fulfilled' && ibovResult.value?.results?.[0]) {
      const data = ibovResult.value.results[0];
      ibov = {
        value: data.regularMarketPrice || 0,
        change: data.regularMarketChangePercent || 0,
        high: data.regularMarketDayHigh || 0,
        low: data.regularMarketDayLow || 0
      };
    }

    // Processamento Dólar - Tentativa 1: Brapi
    if (dollarBrapiResult.status === 'fulfilled' && dollarBrapiResult.value?.results?.[0]) {
      const data = dollarBrapiResult.value.results[0];
      dollar = {
        value: data.regularMarketPrice || 0,
        change: data.regularMarketChangePercent || 0,
        high: data.regularMarketDayHigh || 0,
        low: data.regularMarketDayLow || 0
      };
    }

    // Fallback Dólar - Tentativa 2: AwesomeAPI
    if (dollar.value === 0 && dollarAwesomeResult.status === 'fulfilled' && dollarAwesomeResult.value?.USDBRL) {
      const d = dollarAwesomeResult.value.USDBRL;
      dollar = {
        value: parseFloat(d.bid) || 0,
        change: parseFloat(d.pctChange) || 0,
        high: parseFloat(d.high) || 0,
        low: parseFloat(d.low) || 0
      };
    }

    // Processamento SELIC
    let selic = { value: 11.25, nextCopom: 'A definir' };
    if (selicResult.status === 'fulfilled' && Array.isArray(selicResult.value) && selicResult.value.length > 0) {
      selic = { 
        value: parseFloat(selicResult.value[0].valor) || 11.25, 
        nextCopom: 'Próxima Reunião COPOM' 
      };
    }

    const freshData = { ibov, usd: dollar, selic };

    // ========================================================================
    // 3. ATUALIZA O CACHE NO SUPABASE PARA OS PRÓXIMOS USUÁRIOS
    // ========================================================================
    await supabase
      .from('market_cache')
      .upsert({
        id: 'market_summary',
        data: freshData,
        updated_at: new Date().toISOString()
      });

    return NextResponse.json(freshData);

  } catch (error: any) {
    console.error('❌ Erro Crítico na Rota /api/market:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}