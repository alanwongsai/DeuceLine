import { Surface } from "../domain/schema";

const surfaceLabels: Record<Surface, string> = {
  hard: "Hard",
  clay: "Clay",
  grass: "Grass",
  astro: "Astro",
};

export function SurfaceBadge({ surface }: { surface: Surface }) {
  return <span className={`surface-badge surface-${surface}`}>{surfaceLabels[surface]}</span>;
}
