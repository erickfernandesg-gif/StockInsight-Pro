import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const token = process.env.BRAPI_TOKEN;
    const body = await req.json();
    const { tickers } = body;
    
    if (!token) {
      console.error('❌ ERRO: BRAPI_TOKEN não configurado.');
      return NextResponse.json({ error: 'Brapi token not configured' }, { status: 500 });
    }

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json({});
    }

    // 1. LIMPEZA: Remove espaços em branco e garante que tudo está em maiúsculo
    const cleanTickers = tickers.map((t: string) => t.trim().toUpperCase()).filter(Boolean);
    const tickersStr = cleanTickers.join(',');
    
    const results: Record<string, any> = {};

    // Sempre busca individualmente para respeitar o limite do plano da Brapi
    await Promise.all(
      cleanTickers.map(async (ticker) => {
        try {
          const individualRes = await fetch(`https://brapi.dev/api/quote/${ticker}?token=${token}`);
          const individualData = await individualRes.json();
          
          if (individualData.results && individualData.results.length > 0) {
            const stock = individualData.results[0];
            results[stock.symbol] = {
              ticker: stock.symbol,
              name: stock.longName || stock.shortName || stock.symbol || 'Ativo',
              price: stock.regularMarketPrice || 0,
              change: stock.regularMarketChangePercent || 0,
            };
          }
        } catch (err) {
          console.error(`Erro isolado ao buscar ${ticker}:`, err);
        }
      })
    );

    return NextResponse.json(results);
    
  } catch (error: any) {
    console.error('❌ Erro Crítico na Rota /api/watchlist-data:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}