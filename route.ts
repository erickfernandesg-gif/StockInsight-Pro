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
    // 1. Buscando Cotações Individualmente para respeitar o limite do plano da Brapi
    const [ibovRes, usdRes] = await Promise.allSettled([
      fetch(`https://brapi.dev/api/quote/^BVSP?token=${token}`, { next: { revalidate: 60 } }),
      fetch(`https://brapi.dev/api/quote/USDBRL?token=${token}`, { next: { revalidate: 60 } })
    ]);

    const results: any[] = [];

    // Processa o resultado do Ibovespa
    if (ibovRes.status === 'fulfilled' && ibovRes.value.ok) {
      const data = await ibovRes.value.json();
      if (data.results?.[0]) results.push(data.results[0]);
    }

    // Processa o resultado do Dólar
    if (usdRes.status === 'fulfilled' && usdRes.value.ok) {
      const data = await usdRes.value.json();
      if (data.results?.[0]) results.push(data.results[0]);
    }

    // Se não conseguiu nenhum dado, lança um erro
    if (results.length === 0) {
      // Tenta identificar qual falhou para um log mais específico
      const ibovError = ibovRes.status === 'rejected' ? ibovRes.reason : (ibovRes.status === 'fulfilled' && !ibovRes.value.ok ? `HTTP Error: ${ibovRes.value.status}` : 'No data');
      const usdError = usdRes.status === 'rejected' ? usdRes.reason : (usdRes.status === 'fulfilled' && !usdRes.value.ok ? `HTTP Error: ${usdRes.value.status}` : 'No data');
      console.error(`Falha ao obter dados da Brapi. IBOV: ${ibovError}, USD: ${usdError}`);
      throw new Error('Falha ao obter dados da Brapi. Verifique o limite de requisições ou token.');
    }

    const marketData = results.map((item: any) => ({
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