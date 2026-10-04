import { ReactNode } from "react";
import { identityTextStyle } from "./identityStyle";

// Only call this for Alan-left / Andy-right values, never winner-first scores
// or a numerator/denominator belonging to the same player.
export function PlayerComparison({ alan, opponent, separator = "—" }: {
  alan: ReactNode;
  opponent: ReactNode;
  separator?: string;
}) {
  return <span className="player-comparison"><span style={identityTextStyle("alan")}>{alan}</span><span className="comparison-separator">{separator}</span><span style={identityTextStyle("opponent")}>{opponent}</span></span>;
}
