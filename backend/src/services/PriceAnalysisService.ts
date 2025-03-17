import axios from 'axios';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PriceData {
  date: string;
  price: number;
}

export interface AnalysisResult {
  movingAverage7Day: number;
  movingAverage30Day: number;
  priceChangePercentage: number;
  priceFactor: number;
}

async function fetchHistoricalPrices(tokenId: string, days: number = 30): Promise<PriceData[]> {
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: days,
      },
    });

    const data = response.data as { prices: [number, number][] };
    return data.prices.map((item: [number, number]) => ({
      date: new Date(item[0]).toISOString(),
      price: item[1],
    }));
  } catch (error) {
    logger.error('Error fetching historical prices:', error);
    throw new Error('Failed to fetch historical prices');
  }
}

function calculateMovingAverage(prices: PriceData[], period: number): number {
  if (prices.length < period) {
    throw new Error('Not enough price data to calculate moving average');
  }

  const recentPrices = prices.slice(-period);
  const sum = recentPrices.reduce((acc, data) => acc + data.price, 0);
  return sum / period;
}

function calculatePriceChangePercentage(prices: PriceData[]): number {
  if (prices.length < 2) {
    throw new Error('Not enough price data to calculate price change');
  }

  // Group data points by day to find the last day's price
  const dateMap = new Map<string, PriceData[]>();
  
  prices.forEach(priceData => {
    const date = new Date(priceData.date);
    const dayKey = `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`;
    
    if (!dateMap.has(dayKey)) {
      dateMap.set(dayKey, []);
    }
    dateMap.get(dayKey)!.push(priceData);
  });
  
  const groupedByDay = Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));
  
  if (groupedByDay.length < 2) {
    throw new Error('Not enough days of price data to calculate day-over-day change');
  }
  
  const previousDayData = groupedByDay[groupedByDay.length - 2][1];
  const oldPrice = previousDayData[previousDayData.length - 1].price; // Last price of previous day
  
  const currentDayData = groupedByDay[groupedByDay.length - 1][1];
  const currentPrice = currentDayData[currentDayData.length - 1].price; // Latest price of current day
  const percentageChange = ((currentPrice - oldPrice) / oldPrice) * 100;
  
  return percentageChange;
}

export async function analyzeTokenPrice(tokenId: string = 'injective-protocol'): Promise<AnalysisResult> {
  try {
    // Fetch historical price data
    const priceData = await fetchHistoricalPrices(tokenId);
    
    const movingAverage7Day = calculateMovingAverage(priceData, 7);
    const movingAverage30Day = calculateMovingAverage(priceData, 30);
    
    // Calculate 1-day price change percentage
    const priceChangePercentage = calculatePriceChangePercentage(priceData);
    
    // Use OpenAI to analyze the data and provide a factor between 0-1 or 1-2
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a cryptocurrency price analyzer. Analyze the provided data and return a single number:
          
          - If price is dropping (negative price change %), return a number between 0 and 1:
            * For minimal price drops (0 to -3%), return a number close to 1 (0.7-1.0)
            * For moderate price drops (-3% to -10%), return a mid-range number (0.3-0.7)
            * For significant price drops (< -10%), return a number close to 0 (0.0-0.3)
          
          - If price is rising (positive price change %), return a number between 1 and 2:
            * For minimal price increases (0-3%), return a number close to 1 (1.0-1.3)
            * For moderate price increases (3-10%), return a mid-range number (1.3-1.7)
            * For significant price increases (>10%), return a number close to 2 (1.7-1.9)
          
          Only return the number as a JSON object with a single field called "priceFactor". Nothing else.`
        },
        {
          role: "user",
          content: `
          Please analyze this token data and provide a price factor:
          
          Token: ${tokenId}
          7-Day Moving Average: $${movingAverage7Day.toFixed(4)}
          30-Day Moving Average: $${movingAverage30Day.toFixed(4)}
          1-Day Price Change: ${priceChangePercentage.toFixed(2)}%
          `
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the JSON response
    if (!completion.choices[0].message.content) {
      throw new Error('OpenAI response content is null');
    }
    
    const analysis = JSON.parse(completion.choices[0].message.content);
    const priceFactor = analysis.priceFactor;
    logger.info(`AI analysis for ${tokenId}: Price factor = ${priceFactor}`);
    
    return {
      movingAverage7Day,
      movingAverage30Day,
      priceChangePercentage,
      priceFactor
    };
  } catch (error) {
    logger.error('Error analyzing token price:', error);
    // Default to a neutral factor if analysis fails
    return {
      movingAverage7Day: 0,
      movingAverage30Day: 0,
      priceChangePercentage: 0,
      priceFactor: 1.0 // Neutral factor
    };
  }
}