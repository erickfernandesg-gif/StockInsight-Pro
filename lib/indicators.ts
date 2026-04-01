export type OHLC = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export function calculateSMA(data: number[], period: number): (number | null)[] {
  const sma = new Array(data.length).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma[i] = sum / period;
  }
  return sma;
}

export function calculateEMA(data: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const ema = new Array(data.length).fill(null);
  
  if (data.length < period) return ema;

  const firstSMA = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema[period - 1] = firstSMA;

  for (let i = period; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1]! * (1 - k);
  }
  return ema;
}

export function calculateRSI(data: number[], period: number = 14): (number | null)[] {
  const rsi = new Array(data.length).fill(null);
  if (data.length <= period) return rsi;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Correção: Gravar o primeiro valor do RSI que estava sendo pulado
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    // Wilder's Smoothing Method (Padrão TradingView)
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
  }
  return rsi;
}

export function calculateMACD(data: number[], fast: number = 12, slow: number = 26, signal: number = 9) {
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);
  const macdLine = data.map((_, i) => 
    (emaFast[i] !== null && emaSlow[i] !== null) ? emaFast[i]! - emaSlow[i]! : null
  );
  
  const validMacdStartIndex = macdLine.findIndex(v => v !== null);
  if (validMacdStartIndex === -1) return { macd: macdLine, signal: new Array(data.length).fill(null), histogram: new Array(data.length).fill(null) };
  
  const validMacdValues = macdLine.slice(validMacdStartIndex) as number[];
  const signalLineValid = calculateEMA(validMacdValues, signal);
  
  const signalLine = new Array(data.length).fill(null);
  for(let i=0; i < signalLineValid.length; i++) {
    signalLine[i + validMacdStartIndex] = signalLineValid[i];
  }

  const histogram = macdLine.map((m, i) => 
    (m !== null && signalLine[i] !== null) ? m - signalLine[i]! : null
  );

  return { macd: macdLine, signal: signalLine, histogram };
}

export function calculateBollingerBands(data: number[], period: number = 20, multiplier: number = 2) {
  const sma = calculateSMA(data, period);
  const upper = new Array(data.length).fill(null);
  const lower = new Array(data.length).fill(null);

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = sma[i]!;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    upper[i] = mean + (multiplier * stdDev);
    lower[i] = mean - (multiplier * stdDev);
  }

  return { upper, middle: sma, lower };
}

// NOVO: Average True Range (Para Stop Loss Profissional)
export function calculateATR(ohlc: OHLC[], period: number = 14): (number | null)[] {
  const atr = new Array(ohlc.length).fill(null);
  if (ohlc.length <= period) return atr;

  const tr = new Array(ohlc.length).fill(0);
  tr[0] = ohlc[0].high - ohlc[0].low; 

  for (let i = 1; i < ohlc.length; i++) {
    const highLow = ohlc[i].high - ohlc[i].low;
    const highClose = Math.abs(ohlc[i].high - ohlc[i - 1].close);
    const lowClose = Math.abs(ohlc[i].low - ohlc[i - 1].close);
    tr[i] = Math.max(highLow, highClose, lowClose);
  }

  let sumTR = 0;
  for (let i = 1; i <= period; i++) sumTR += tr[i];
  let currentATR = sumTR / period;
  atr[period] = currentATR;

  for (let i = period + 1; i < ohlc.length; i++) {
    currentATR = (currentATR * (period - 1) + tr[i]) / period;
    atr[i] = currentATR;
  }

  return atr;
}