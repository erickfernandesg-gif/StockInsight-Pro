import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR
} from '@/lib/indicators';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { ticker } = await req.json();
    const brapiToken = process.env.BRAPI_TOKEN;

    if (!ticker) return NextResponse.json({ error: 'Ticker required' }, { status: 400 });
    if (!brapiToken) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const formattedTicker = ticker.trim().toUpperCase();
    const cleanToken = brapiToken.trim();
    
    // 1. Fetch Simultâneo: Ativo Alvo + Índice Bovespa (Risco Sistêmico)
    // Usamos Promise.all para não perder tempo e buscar os dois ao mesmo tempo
    const [resAsset, resIbov] = await Promise.all([
      fetch(`https://brapi.dev/api/quote/${formattedTicker}?range=3mo&interval=1d&token=${cleanToken}`),
      fetch(`https://brapi.dev/api/quote/^BVSP?token=${cleanToken}`)
    ]);
    
    if (!resAsset.ok) throw new Error(`Failed to fetch asset data: ${resAsset.status}`);
    
    const dataAsset = await resAsset.json();
    const dataIbov = resIbov.ok ? await resIbov.json() : null;

    const results = dataAsset.results[0];
    const historicalData = results?.historicalDataPrice || results?.historicalData;
    
    if (!historicalData || historicalData.length === 0) {
      throw new Error('No historical data found for this ticker');
    }

    // Extração do Risco Sistêmico (IBOVESPA)
    const ibovChange = dataIbov?.results?.[0]?.regularMarketChangePercent || 0;
    const marketMood = ibovChange <= -1.0 ? 'Pessimista/Bearish' : ibovChange >= 1.0 ? 'Otimista/Bullish' : 'Neutro/Lateral';

    // Mapeamento OHLCV
    const ohlcData = historicalData.map((d: any) => ({
      date: new Date(d.date * 1000).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume
    }));
    const closes = ohlcData.map((d: any) => d.close);
    const highs = ohlcData.map((d: any) => d.high);
    const lows = ohlcData.map((d: any) => d.low);
    const volumes = ohlcData.map((d: any) => d.volume);
    
    // 2. Cálculos Institucionais (Matemática Pura)
    const lastIdx = closes.length - 1;
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const sma50 = calculateSMA(closes, 50);
    const rsi = calculateRSI(closes, 14);
    const macdData = calculateMACD(closes);
    const bbData = calculateBollingerBands(closes);
    const atrData = calculateATR(ohlcData, 14);
    const volSma20 = calculateSMA(volumes, 20);

    // NOVO: Extração de Suportes e Resistências (Price Action de 3 meses)
    const resistance3m = Math.max(...highs);
    const support3m = Math.min(...lows);

    const indicators = {
      currentPrice: closes[lastIdx],
      ema9: ema9[lastIdx],
      ema21: ema21[lastIdx],
      sma50: sma50[lastIdx] || null, 
      rsi: rsi[lastIdx],
      macdHist: macdData.histogram[lastIdx] || 0,
      bbUpper: bbData.upper[lastIdx] || null,
      bbLower: bbData.lower[lastIdx] || null,
      atr: atrData[lastIdx] || 0,
      volToday: volumes[lastIdx] || 0,
      volAvg: volSma20[lastIdx] || 1 
    };

    const volRatio = (indicators.volToday / indicators.volAvg).toFixed(2);
    const distSma50 = indicators.sma50 ? (((indicators.currentPrice - indicators.sma50) / indicators.sma50) * 100).toFixed(2) : '0.00';

    // 3. Preparação do Gráfico (Chart Data) para o Frontend
    const chartData = ohlcData.slice(-60).map((day: any, index: number) => {
      const realIndex = (ohlcData.length - 60) + index;
      return {
        date: day.date,
        price: day.close,
        sma50: sma50[realIndex] ? Number(sma50[realIndex].toFixed(2)) : null
      };
    });

    // 4. Prompt Cérebro - A Mesa de Operações Atualizada
    const prompt = `INFORME ESTATÍSTICO DO ATIVO: ${formattedTicker}
    
    1. CONTEXTO MACRO (Risco Sistêmico):
    - IBOVESPA Hoje: ${ibovChange.toFixed(2)}% (${marketMood})
    - Limite de Risco do Usuário: Máximo de 2% do capital total por operação.

    2. PRICE ACTION ESTÁTICO (3 Meses):
    - Resistência Máxima (Topo): R$ ${resistance3m.toFixed(2)}
    - Suporte Mínimo (Fundo): R$ ${support3m.toFixed(2)}

    3. CENÁRIO TÉCNICO DIÁRIO (EOD):
    - Cotação Atual (Spot): R$ ${indicators.currentPrice?.toFixed(2)}
    - Média Móvel Simples (SMA 50): R$ ${indicators.sma50 ? indicators.sma50.toFixed(2) : 'N/A'}
    - Distância do Preço para SMA 50: ${distSma50}%
    - Cruzamento (EMA 9 / 21): R$ ${indicators.ema9?.toFixed(2)} / R$ ${indicators.ema21?.toFixed(2)}
    - Força Relativa (RSI 14): ${indicators.rsi?.toFixed(2)}
    - Divergência (MACD Histograma): ${indicators.macdHist?.toFixed(4)}
    - ATR (14 dias - Volatilidade): R$ ${indicators.atr?.toFixed(2)}
    - Anomalia de Volume (Hoje vs Média): ${volRatio}x

    Com base na matriz acima, execute a validação de risco e gere o setup.`;

    // 5. System Instructions Institucionais com Exponential Backoff
    let result;
    let retries = 3;
    let delay = 2000;

    while (retries > 0) {
      try {
        result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            systemInstruction: `Você é o "Head of Quantitative Analysis" de um fundo focado em Swing Trade. Você NÃO opera emoções, opera anomalias estatísticas, price action e gestão de risco estrita.
            
            Você responderá EXCLUSIVAMENTE em formato JSON.

            REGRAS DE CONFLUÊNCIA E LIMITAÇÃO DE RISCO (HARD RULES):
            1. RISCO SISTÊMICO (BETA): Se o IBOVESPA estiver "Pessimista/Bearish" (caindo forte), seja EXTREMAMENTE rigoroso para autorizar compras. Exija um setup perfeito (Volume > 1.2x e preço próximo ao Suporte).
            2. SUPORTES E RESISTÊNCIAS: O Preço de Entrada (Atual) NUNCA pode estar colado na "Resistência Máxima". Se estiver a menos de 1x ATR da resistência, rejeite a compra (Neutro). É preferível comprar perto do "Suporte Mínimo".
            3. ESTRUTURA DE RISCO E CAPITAL (2% RULE):
               - ENTRY_PRICE = Preço Atual exato.
               - STOP_LOSS = [Preço Atual - (2.5 * ATR)]. Valide se este stop fica abaixo de médias importantes ou do Suporte de 3m. Arredonde a 2 casas decimais.
               - TAKE_PROFIT = [Preço Atual + (5.0 * ATR)]. Verifique se o alvo não esbarra na Resistência de 3m. Se esbarrar, diminua o alvo para o valor da Resistência.
            4. JUSTIFICATIVA FIDUCIÁRIA (PT-BR): Escreva um parágrafo denso e profissional. Você DEVE mencionar:
               - O clima do IBOVESPA (Correlação).
               - Onde o preço está em relação ao Suporte/Resistência estáticos.
               - O alinhamento técnico (RSI, Volume, ATR).
               - Mencione que o Stop Loss foi calculado matematicamente para respeitar o limite de perda de 2% do capital do usuário (Position Sizing).

            ATENÇÃO: Caso as métricas não atinjam os níveis mínimos de segurança, a recomendação DEVE ser "Neutro" ou "Venda", justificando o prêmio de risco desfavorável.`,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendation: { type: Type.STRING, enum: ["Compra Forte", "Compra", "Neutro", "Venda"] },
                entry_price: { type: Type.NUMBER },
                stop_loss: { type: Type.NUMBER },
                take_profit: { type: Type.NUMBER },
                justification: { type: Type.STRING }
              },
              required: ["recommendation", "entry_price", "stop_loss", "take_profit", "justification"]
            }
          }
        });
        
        break; 

      } catch (aiError: any) {
        if (aiError.status === 503 && retries > 1) {
          console.warn(`⏳ [Gemini API 503] Servidor ocupado. Retentando em ${delay}ms... (Tentativas: ${retries - 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries--;
          delay *= 1.5;
        } else {
          throw aiError;
        }
      }
    }

    if (!result) throw new Error("AI model failed after multiple retries.");

    const responseText = result.text;
    if (!responseText) throw new Error("AI response was empty.");
    
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) throw new Error("No JSON object found.");
    
    const cleanJson = responseText.substring(startIndex, endIndex + 1);
    const analysis = JSON.parse(cleanJson);

    if (isNaN(analysis.entry_price)) analysis.entry_price = indicators.currentPrice;

    return NextResponse.json({
      ticker: formattedTicker,
      chartData: chartData,
      indicators: {
        rsi: indicators.rsi,
        sma50: indicators.sma50,
        macd: indicators.macdHist,
        atr: indicators.atr
      },
      analysis
    });

  } catch (error: any) {
    console.error("Analyze Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}