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
    
    const [resAsset, resIbov] = await Promise.all([
      fetch(`https://brapi.dev/api/quote/${formattedTicker}?range=3mo&interval=1d&token=${cleanToken}`),
      fetch(`https://brapi.dev/api/quote/^BVSP?token=${cleanToken}`)
    ]);
    
    if (!resAsset.ok) throw new Error(`Failed to fetch asset data: ${resAsset.status}`);
    
    const dataAsset = await resAsset.json();
    const dataIbov = resIbov.ok ? await resIbov.json() : null;

    const results = dataAsset.results[0];
    const historicalData = results?.historicalDataPrice || results?.historicalData;
    
    if (!historicalData || historicalData.length === 0) throw new Error('No historical data found');

    const ibovChange = dataIbov?.results?.[0]?.regularMarketChangePercent || 0;

    const ohlcData = historicalData.map((d: any) => ({
      date: new Date(d.date * 1000).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume
    }));
    
    const closes = ohlcData.map((d: any) => d.close);
    const highs = ohlcData.map((d: any) => d.high);
    const lows = ohlcData.map((d: any) => d.low);
    const volumes = ohlcData.map((d: any) => d.volume);
    
    const lastIdx = closes.length - 1;
    const sma50 = calculateSMA(closes, 50);
    const rsi = calculateRSI(closes, 14);
    const macdData = calculateMACD(closes);
    const atrData = calculateATR(ohlcData, 14);
    const volSma20 = calculateSMA(volumes, 20);

    const indicators = {
      currentPrice: closes[lastIdx],
      sma50: sma50[lastIdx] || null, 
      rsi: rsi[lastIdx] || 50,
      macdHist: macdData.histogram[lastIdx] || 0,
      atr: atrData[lastIdx] || (closes[lastIdx] * 0.02), // Fallback de 2% se faltar ATR
      volToday: volumes[lastIdx] || 0,
      volAvg: volSma20[lastIdx] || 1 
    };

    const resistance3m = Math.max(...highs);
    const support3m = Math.min(...lows);

    // =========================================================================
    // 🧠 1. MOTOR DETERMINÍSTICO (O Algoritmo toma a decisão, não a IA)
    // =========================================================================
    
    let hardRecommendation = "Neutro";
    
    // Regra de Compra: Preço acima da SMA50 (Tendência), RSI descontado (< 60) e MACD ganhando força
    if (indicators.currentPrice > (indicators.sma50 || 0) && indicators.rsi < 60 && indicators.macdHist > 0) {
      hardRecommendation = "Compra";
      if (indicators.rsi < 40 && ibovChange > 0) hardRecommendation = "Compra Forte";
    } 
    // Regra de Venda: Preço abaixo da SMA50, RSI esticado (> 60) ou MACD perdendo força
    else if (indicators.currentPrice < (indicators.sma50 || 0) && (indicators.rsi > 60 || indicators.macdHist < 0)) {
      hardRecommendation = "Venda";
      if (indicators.rsi > 70 && ibovChange < 0) hardRecommendation = "Venda Forte";
    }

    // Cálculos Estritos de Gestão de Risco
    const calcEntry = indicators.currentPrice;
    
    // Stop Loss: 2.5x ATR, mas nunca maior que 5% de queda do preço atual
    let calcStop = calcEntry - (2.5 * indicators.atr);
    const maxStopAllowed = calcEntry * 0.95; 
    if (calcStop < maxStopAllowed) calcStop = maxStopAllowed;

    // Take Profit: 5x ATR, mas travado na Resistência dos últimos 3 meses
    let calcTarget = calcEntry + (5.0 * indicators.atr);
    if (calcTarget > resistance3m) calcTarget = resistance3m; // Não promete alvos irreais

    // Formatação segura com 2 casas decimais
    const finalSetup = {
      recommendation: hardRecommendation,
      entry_price: Number(calcEntry.toFixed(2)),
      stop_loss: Number(calcStop.toFixed(2)),
      take_profit: Number(calcTarget.toFixed(2))
    };

    // =========================================================================
    // 🗣️ 2. MOTOR SEMÂNTICO (A IA apenas explica a nossa matemática)
    // =========================================================================

    const prompt = `ATENÇÃO: A DECISÃO JÁ FOI TOMADA PELO NOSSO ALGORITMO QUANTITATIVO. 
    A sua função é APENAS atuar como um tutor e explicar essa decisão de forma didática para um investidor iniciante.

    DADOS TÉCNICOS DO ATIVO: ${formattedTicker}
    - IBOVESPA Hoje: ${ibovChange.toFixed(2)}%
    - RSI (Força): ${indicators.rsi.toFixed(2)}
    - MACD (Tendência): ${indicators.macdHist.toFixed(4)}

    A NOSSA DECISÃO DETERMINÍSTICA:
    - Veredicto do Algoritmo: ${finalSetup.recommendation}
    - Preço Atual/Entrada: R$ ${finalSetup.entry_price}
    - Stop Loss Calculado: R$ ${finalSetup.stop_loss}
    - Alvo (Take Profit): R$ ${finalSetup.take_profit}

    TAREFA:`;

    let result;
    let retries = 3;
    let delay = 2000;

    while (retries > 0) {
      try {
        result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            systemInstruction: `Você é um Tutor Financeiro Sênior. Você recebe um Veredicto Matemático e deve explicá-lo em PT-BR simples e empático, sem jargões.
            
            Você deve gerar APENAS 2 textos em JSON:
            1. "justification": Explique POR QUE o algoritmo decidiu dar o veredicto recebido. Traduza os números (RSI, MACD) para a vida real (ex: "A ação caiu muito e agora parece barata").
            2. "risk_scenario": Explique o risco da operação e por que o Stop Loss definido no prompt deve ser rigorosamente respeitado.`,
            
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                justification: { type: Type.STRING },
                risk_scenario: { type: Type.STRING }
              },
              required: ["justification", "risk_scenario"]
            }
          }
        });
        break; 
      } catch (aiError: any) {
        if (aiError.status === 503 && retries > 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          retries--; delay *= 1.5;
        } else throw aiError;
      }
    }

    if (!result) throw new Error("AI failed");

    const responseText = result.text;
    if (!responseText) throw new Error("AI response empty");
    
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    const cleanJson = responseText.substring(startIndex, endIndex + 1);
    const aiTexts = JSON.parse(cleanJson);

    // =========================================================================
    // 🔗 3. MERGE: Junta o Cálculo Determinístico com a Explicação da IA
    // =========================================================================

    const chartData = ohlcData.slice(-60).map((day: any, index: number) => {
      const realIndex = (ohlcData.length - 60) + index;
      return { date: day.date, price: day.close, sma50: sma50[realIndex] ? Number(sma50[realIndex].toFixed(2)) : null };
    });

    return NextResponse.json({
      ticker: formattedTicker,
      chartData: chartData,
      indicators: {
        rsi: indicators.rsi,
        sma50: indicators.sma50,
        macd: indicators.macdHist,
        atr: indicators.atr
      },
      analysis: {
        ...finalSetup, // Os números cravados pelo código (À prova de balas)
        justification: aiTexts.justification, // O texto amigável gerado pela IA
        risk_scenario: aiTexts.risk_scenario  // O texto de risco gerado pela IA
      }
    });

  } catch (error: any) {
    console.error("Analyze Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}