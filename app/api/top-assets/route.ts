import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.BRAPI_TOKEN;
  
  if (!token) {
    return NextResponse.json({ error: 'Brapi token not configured' }, { status: 500 });
  }

  try {
    // Trazendo apenas Ações Brasileiras (type=stock) reais e com maior volume
    const res = await fetch(`https://brapi.dev/api/quote/list?sortBy=volume&sortOrder=desc&limit=10&type=stock&token=${token}`);
    
    if (!res.ok) throw new Error('Falha ao buscar top assets da Brapi');
    
    const data = await res.json();
    
    const assets = data.stocks.map((stock: any) => ({
      ticker: stock.stock,
      name: stock.name,
      price: stock.close || 0,
      change: stock.change || 0,
      isPositive: stock.change >= 0,
      marketCap: stock.market_cap || 'N/A',
      volume: stock.volume || 0,
      trend: [10, 20, 15, 40, 35, 60, 55, 85] // Mock trend visual
    }));

    return NextResponse.json(assets);
  } catch (error: any) {
    console.error('Erro na rota top-assets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}