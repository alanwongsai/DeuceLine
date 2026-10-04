import { CSSProperties } from "react";
import { DeucelineDataset, PlayerKey } from "../domain/schema";

// One presentation mapping for text, bars, SVG and form previews. The dataset
// stays untouched; Wimbledon day (or an unknown skin) uses its original colours.
export function identityPaletteStyle(players: DeucelineDataset["rivalry"]["players"]): CSSProperties {
  return {
    "--player-alan": `var(--theme-alan, ${players.alan.color})`,
    "--player-opponent": `var(--theme-opponent, ${players.opponent.color})`,
  } as CSSProperties;
}

export function identityColor(player: PlayerKey): string {
  return `var(--player-${player})`;
}

export function identityTextStyle(player: PlayerKey | undefined): CSSProperties {
  return player ? { color: identityColor(player) } : {};
}
