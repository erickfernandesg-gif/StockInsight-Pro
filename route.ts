import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.BRAPI_TOKEN;
  console.log('Token usado:', token);

  if (!token) {
    return NextResponse.json(
      { error: 'Brapi token is not configured in environment variables' },
      { status: 500 }
    );
  }

  try {
    // 1. Buscando Cotações (Ibovespa e Dólar) na Brapi (Crítico)
    const quotesRes = await fetch(
      `https://brapi.dev/api/quote/^BVSP,USDBRL?token=${token}`,
      { next: { revalidate: 60 } } // Cache de 60 segundos
    );

    if (!quotesRes.ok) {
      throw new Error(`Brapi API Error: ${quotesRes.status} ${quotesRes.statusText}`);
    }

    const quotesData = await quotesRes.json();
    
    // Verificação de segurança: garante que results existe e é um array
    if (!quotesData.results || !Array.isArray(quotesData.results)) {
      console.error('Brapi Response inválida:', quotesData);
      throw new Error('Retorno inválido da Brapi. Verifique o token.');
    }

    const marketData = quotesData.results.map((item: any) => ({
      ticker: item.symbol,
      price: item.regularMarketPrice,
      changePercent: item.regularMarketChangePercent,
    }));

    // 2. Buscando SELIC (Fallback isolado em try/catch)
    try {
      const selicRes = await fetch(
        'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json',
        { next: { revalidate: 3600 } }
      );

      if (selicRes.ok) {
        const selicData = await selicRes.json();
        if (selicData && selicData.length > 0) {
          marketData.push({
            ticker: 'SELIC',
            price: parseFloat(selicData[0].valor),
            changePercent: 0,
          });
        }
      }
    } catch (selicError) {
      console.error('Erro ao buscar SELIC (ignorado):', selicError);
    }

    return NextResponse.json(marketData);

  } catch (error: any) {
    console.error('Erro detalhado:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}