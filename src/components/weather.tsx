import { WeatherTag } from "../domain/schema";

// Display labels for the weather vocabulary. The tag set itself lives in
// schema.ts (WEATHER_TAGS); add a tag there and its label here to extend.
export const WEATHER_LABELS: Record<WeatherTag, string> = {
  sunny: "☀️ Sunny",
  cloudy: "⛅ Cloudy",
  windy: "💨 Windy",
  hot: "🥵 Hot",
};

export const formatTemp = (tempC: number): string => `${tempC}°C`;

// Read-only weather summary: the felt-condition tags and, when present, the
// temperature. Renders nothing when a match carries no weather at all.
export function WeatherBadges({ conditions, tempC }: { conditions?: WeatherTag[]; tempC?: number }) {
  const hasConditions = conditions !== undefined && conditions.length > 0;
  if (!hasConditions && tempC === undefined) return null;

  return (
    <span className="weather-badges">
      {hasConditions
        ? conditions.map((tag) => (
            <span className="weather-badge" key={tag}>
              {WEATHER_LABELS[tag]}
            </span>
          ))
        : null}
      {tempC !== undefined ? <span className="weather-badge weather-temp">{formatTemp(tempC)}</span> : null}
    </span>
  );
}
