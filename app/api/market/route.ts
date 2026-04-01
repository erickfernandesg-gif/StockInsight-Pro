import { NextResponse } from 'next/server';

// Garante que a rota seja sempre processada no servidor (evita erro de prerender)
export const dynamic = 'force-dynamic';

export async function GET() {
  const token = process.env.BRAPI_TOKEN;
  
  if (!token) {
    console.warn('⚠️ BRAPI_TOKEN não encontrado. Ibovespa será retornado com valores zerados.');
  }

  try {
    // Execução paralela para performance máxima e isolamento de falhas
    const [ibovResult, dollarResult, selicResult] = await Promise.allSettled([
      // Tentamos buscar Ibov e Dólar juntos na Brapi por ser mais estável em produção
      token 
        ? fetch(`https://brapi.dev/api/quote/^BVSP,USDBRL?token=${token}`, { next: { revalidate: 60 } }).then(res => res.json())
        : Promise.resolve(null),
      // AwesomeAPI com User-Agent para evitar bloqueios da Vercel
      fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', { 
        next: { revalidate: 60 },
        headers: { 'User-Agent': 'StockInsightPro/1.0' } 
      }).then(res => res.ok ? res.json() : Promise.reject('AwesomeAPI offline')),
      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json', { next: { revalidate: 3600 } }).then(res => res.json())
    ]);

    // 1. Processamento Ibovespa e Dólar (Fonte Principal: Brapi)
    let ibov = { value: 0, change: 0, high: 0, low: 0 };
    let dollar = { value: 0, change: 0, high: 0, low: 0 };

    if (ibovResult.status === 'fulfilled' && ibovResult.value?.results) {
      const results = ibovResult.value.results;
      
      // Extrai Ibovespa
      const ibovData = results.find((r: any) => r.symbol === '^BVSP');
      if (ibovData) {
        ibov = {
          value: ibovData.regularMarketPrice || 0,
          change: ibovData.regularMarketChangePercent || 0,
          high: ibovData.regularMarketDayHigh || 0,
          low: ibovData.regularMarketDayLow || 0
        };
      }

      // Extrai Dólar da Brapi (Primeira opção)
      const dollarBrapi = results.find((r: any) => r.symbol === 'USDBRL');
      if (dollarBrapi) {
        dollar = {
          value: dollarBrapi.regularMarketPrice || 0,
          change: dollarBrapi.regularMarketChangePercent || 0,
          high: dollarBrapi.regularMarketDayHigh || 0,
          low: dollarBrapi.regularMarketDayLow || 0
        };
      }
    }

    // 2. Fallback Dólar (Fonte Secundária: AwesomeAPI)
    // Se o valor ainda for 0 (Brapi falhou ou não tem token), tenta AwesomeAPI
    if (dollar.value === 0 && dollarResult.status === 'fulfilled' && dollarResult.value?.USDBRL) {
      const d = dollarResult.value.USDBRL;
      dollar = {
        value: parseFloat(d.bid) || 0,
        change: parseFloat(d.pctChange) || 0,
        high: parseFloat(d.high) || 0,
        low: parseFloat(d.low) || 0
      };
    }

    // 3. Processamento SELIC
    let selic = { value: 11.25, nextCopom: 'A definir' };
    if (selicResult.status === 'fulfilled' && Array.isArray(selicResult.value) && selicResult.value.length > 0) {
      selic = { 
        value: parseFloat(selicResult.value[0].valor) || 11.25, 
        nextCopom: 'Próxima Reunião COPOM' 
      };
    }

    return NextResponse.json({
      ibov,
      usd: dollar,
      selic
    });
  } catch (error: any) {
    console.error('❌ Erro Crítico na Rota /api/market:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}