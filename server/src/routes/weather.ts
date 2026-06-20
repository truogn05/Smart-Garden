import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Coordinates for Hanoi
const LAT = process.env.LATITUDE || '21.0134';
const LNG = process.env.LONGITUDE || '105.8477';

interface Cache {
  data: any;
  timestamp: number;
}

let weatherCache: Cache | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

function getWeatherType(code: number): 'clear' | 'cloudy' | 'rainy' {
  if (code === 0) return 'clear';
  if (code >= 1 && code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'cloudy';
  return 'rainy';
}

const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
function getDayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'TODAY';
  const date = new Date(dateStr);
  return DAYS_OF_WEEK[date.getDay()];
}

router.get('/forecast', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const now = Date.now();
  if (weatherCache && now - weatherCache.timestamp < CACHE_DURATION_MS) {
    res.json(weatherCache.data);
    return;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API returned status ${response.status}`);
    }
    const rawData = await response.json();

    if (!rawData.daily) {
      throw new Error('Invalid response from Open-Meteo');
    }

    const daily = rawData.daily;
    const forecast = [];
    let rainWarningDay = '';
    let highestRainChance = 0;

    for (let i = 0; i < 7; i++) {
      if (!daily.time[i]) break;

      const dateStr = daily.time[i];
      const maxTemp = Math.round(daily.temperature_2m_max[i]);
      const minTemp = Math.round(daily.temperature_2m_min[i]);
      const rainChance = daily.precipitation_probability_max[i] ?? 0;
      const weatherCode = daily.weather_code[i] ?? 0;

      const type = getWeatherType(weatherCode);
      const dayLabel = getDayLabel(dateStr, i);

      forecast.push({
        day: dayLabel,
        temp: `${maxTemp}° / ${minTemp}°`,
        rain: `${rainChance}%`,
        type,
      });

      if (rainChance > highestRainChance) {
        highestRainChance = rainChance;
        if (rainChance >= 60) {
          rainWarningDay = dayLabel === 'TODAY' ? 'Hôm nay' : dayLabel;
        }
      }
    }

    let alert = 'Thời tiết ổn định. Hệ thống tưới tự động hoạt động bình thường.';
    if (highestRainChance >= 60 && rainWarningDay) {
      const dayName = rainWarningDay === 'Hôm nay' ? 'hôm nay' : `Thứ ${rainWarningDay === 'MON' ? 'Hai' : rainWarningDay === 'TUE' ? 'Ba' : rainWarningDay === 'WED' ? 'Tư' : rainWarningDay === 'THU' ? 'Năm' : rainWarningDay === 'FRI' ? 'Sáu' : rainWarningDay === 'SAT' ? 'Bảy' : 'Chủ Nhật'}`;
      alert = `Dự báo có mưa lớn (${highestRainChance}%) vào ${dayName}. Hệ thống tưới tự động sẽ được tạm dừng để tránh ngập úng rễ.`;
    }

    const payload = { forecast, alert };
    weatherCache = { data: payload, timestamp: now };
    
    res.json(payload);
  } catch (error: any) {
    console.error('[Weather] Forecast fetch error:', error.message);
    const fallback = {
      forecast: [
        { day: 'TODAY', temp: '24° / 16°', rain: '0%', type: 'clear' },
        { day: 'MON', temp: '22° / 15°', rain: '15%', type: 'cloudy' },
        { day: 'TUE', temp: '19° / 12°', rain: '85%', type: 'rainy' },
        { day: 'WED', temp: '18° / 11°', rain: '90%', type: 'rainy' },
        { day: 'THU', temp: '20° / 14°', rain: '30%', type: 'cloudy' },
        { day: 'FRI', temp: '21° / 15°', rain: '20%', type: 'cloudy' },
        { day: 'SAT', temp: '23° / 16°', rain: '10%', type: 'clear' },
      ],
      alert: 'Kết nối thời tiết lỗi. Sử dụng dữ liệu dự phòng. Hệ thống tưới tự động hoạt động bình thường.'
    };
    res.json(fallback);
  }
});

export default router;
