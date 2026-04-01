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
    
    // 2. TENTATIVA 1: Busca todos de uma vez (Lote) para ser mais rápido
    const res = await fetch(`https://brapi.dev/api/quote/${tickersStr}?token=${token}`);
    const data = await res.json();
    
    const results: Record<string, any> = {};

    // 3. PLANO B (Fallback): Se a Brapi der erro (ex: 1 ticker inválido estragou o lote todo)
    if (data.error) {
      console.warn(`⚠️ Lote rejeitado pela Brapi. Motivo: ${data.message}. Buscando individualmente...`);
      
      // O sistema busca um por um, salvando os que dão certo e ignorando o que deu erro
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
    }
    
    // 4. Se a Tentativa 1 funcionou perfeitamente, salva tudo
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach((stock: any) => {
        results[stock.symbol] = {
          ticker: stock.symbol,
          name: stock.longName || stock.shortName || stock.symbol || 'Ativo',
          price: stock.regularMarketPrice || 0,
          change: stock.regularMarketChangePercent || 0,
        };
      });
    }

    return NextResponse.json(results);
    
  } catch (error: any) {
    console.error('❌ Erro Crítico na Rota /api/watchlist-data:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}