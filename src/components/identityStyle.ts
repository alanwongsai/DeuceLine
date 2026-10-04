import { CSSProperties } from "react";

// Preserve dataset identity while letting the night material give text enough contrast.
export function identityTextStyle(color: string | undefined): CSSProperties {
  return { color, "--identity": color } as CSSProperties;
}
