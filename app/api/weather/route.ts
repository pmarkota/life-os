import { NextResponse } from "next/server";

// Uses Open-Meteo API — completely free, no API key required
// https://open-meteo.com/

interface OpenMeteoResponse {
  current_weather: {
    temperature: number;
    windspeed: number;
    weathercode: number;
    is_day: number;
  };
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  feels_like: number;
  humidity: number;
}

// WMO Weather interpretation codes → descriptions
const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

// Simple in-memory cache
interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
let weatherCache: CacheEntry | null = null;

// Zagreb coordinates
const ZAGREB_LAT = 45.815;
const ZAGREB_LON = 15.9819;

export async function GET() {
  try {
    // Return cached data if still fresh
    if (weatherCache && Date.now() - weatherCache.timestamp < CACHE_DURATION_MS) {
      return NextResponse.json(weatherCache.data);
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${ZAGREB_LAT}&longitude=${ZAGREB_LON}&current_weather=true`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error("Open-Meteo API error:", response.status);
      return NextResponse.json(
        { error: `Weather API returned ${response.status}` },
        { status: 200 },
      );
    }

    const raw = (await response.json()) as OpenMeteoResponse;
    const cw = raw.current_weather;

    const weatherData: WeatherData = {
      temp: Math.round(cw.temperature),
      description: WMO_CODES[cw.weathercode] ?? "Unknown",
      icon: cw.is_day ? "day" : "night",
      feels_like: Math.round(cw.temperature), // Open-Meteo current_weather doesn't include feels_like
      humidity: 0, // Not available in current_weather endpoint
    };

    weatherCache = { data: weatherData, timestamp: Date.now() };

    return NextResponse.json(weatherData);
  } catch (error) {
    console.error("Weather route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 200 },
    );
  }
}
