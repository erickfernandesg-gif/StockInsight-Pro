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
      token 
        ? fetch(`https://brapi.dev/api/quote/^BVSP?token=${token}`, { next: { revalidate: 60 } }).then(res => res.json())
        : Promise.resolve(null),
      fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', { next: { revalidate: 60 } }).then(res => res.json()),
      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json', { next: { revalidate: 3600 } }).then(res => res.json())
    ]);

    // 1. Processamento Ibovespa
    let ibov = { value: 0, change: 0, high: 0, low: 0 };
    if (ibovResult.status === 'fulfilled' && ibovResult.value?.results?.[0]) {
      const data = ibovResult.value.results[0];
      ibov = {
        value: data.regularMarketPrice || 0,
        change: data.regularMarketChangePercent || 0,
        high: data.regularMarketDayHigh || 0,
        low: data.regularMarketDayLow || 0
      };
    }

    // 2. Processamento Dólar (AwesomeAPI) - Garantindo que USDBRL seja validado
    let dollar = { value: 0, change: 0, high: 0, low: 0 };
    if (dollarResult.status === 'fulfilled' && dollarResult.value?.USDBRL) {
      const d = dollarResult.value.USDBRL;
      dollar = {
        value: parseFloat(d.bid) || 0,
        change: parseFloat(d.pctChange) || 0,
        high: parseFloat(d.high) || 0,
        low: parseFloat(d.low) || 0
      };
    } else {
      console.error('⚠️ Erro na AwesomeAPI para Dólar:', dollarResult.status === 'rejected' ? dollarResult.reason : 'Resposta Inválida');
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