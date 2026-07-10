import { DeucelineDataset } from "../domain/schema";
import { validateDataset } from "../domain/validateDataset";

export async function loadDataset(): Promise<DeucelineDataset> {
  // Ask the browser for a fresh response whenever it is online. The service
  // worker still provides its network-first offline fallback, but a cached
  // payload from an older validator must not become the preferred live read.
  const response = await fetch(`${import.meta.env.BASE_URL}data/deuceline-data.json`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load Deuceline dataset.");
  }

  return validateDataset(await response.json());
}
