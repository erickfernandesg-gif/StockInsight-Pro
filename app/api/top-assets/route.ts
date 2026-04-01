import { NextResponse } from 'next/server';
import { calculateRSI } from '@/lib/indicators';

export async function GET() {
  const token = process.env.BRAPI_TOKEN;
  
  if (!token) {
    return NextResponse.json({ error: 'Brapi token not configured' }, { status: 500 });
  }

  try {
    const listRes = await fetch(`https://brapi.dev/api/quote/list?sortBy=volume&sortOrder=desc&limit=10&type=stock&token=${token}`);
    
    if (!listRes.ok) throw new Error('Falha ao buscar top assets da Brapi');
    
    const listData = await listRes.json();
    const topStocks = listData.stocks || [];

    if (topStocks.length === 0) return NextResponse.json([]);

    const tickersString = topStocks.map((s: any) => s.stock).join(',');
    const historyRes = await fetch(`https://brapi.dev/api/quote/${tickersString}?range=1mo&interval=1d&token=${token}`);
    const historyData = historyRes.ok ? await historyRes.json() : { results: [] };

    const assets = topStocks.map((stock: any) => {
      let trendScore = 50; 
      let trendGraph = [50, 50, 50, 50, 50]; // Fallback caso não tenha dados
      
      const assetHistory = historyData.results?.find((r: any) => r.symbol === stock.stock);

      if (assetHistory && assetHistory.historicalDataPrice && assetHistory.historicalDataPrice.length > 0) {
        const closePrices = assetHistory.historicalDataPrice.map((day: any) => day.close);

        // 1. Calcular o RSI (Termômetro)
        if (closePrices.length >= 15) {
          const rsiResults = calculateRSI(closePrices, 14);
          const lastRSI = rsiResults[rsiResults.length - 1];
          if (lastRSI !== null && !isNaN(lastRSI)) {
            trendScore = lastRSI;
          }
        }

        // 2. CORREÇÃO AQUI: Calcular o mini-gráfico (Sparkline) REAL
        // Pega os últimos 10 dias
        const recentPrices = closePrices.slice(-10);
        const minPrice = Math.min(...recentPrices);
        const maxPrice = Math.max(...recentPrices);
        
        // Transforma os preços reais em percentagem (0 a 100) para o SVG desenhar
        if (maxPrice > minPrice) {
          trendGraph = recentPrices.map((p: number) => ((p - minPrice) / (maxPrice - minPrice)) * 100);
        }
      }

      return {
        ticker: stock.stock,
        name: stock.name,
        price: stock.close || 0,
        change: stock.change || 0,
        isPositive: stock.change >= 0,
        marketCap: stock.market_cap || 'N/A',
        volume: stock.volume || 0,
        trendScore: trendScore,
        trend: trendGraph // DEVOLVENDO A TREND REAL AQUI!
      };
    });

    return NextResponse.json(assets);
  } catch (error: any) {
    console.error('Erro na rota top-assets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}