import { DeucelineDataset } from "../domain/schema";
import { validateDataset } from "../domain/validateDataset";

export async function loadDataset(): Promise<DeucelineDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/deuceline-data.json`);

  if (!response.ok) {
    throw new Error("Failed to load Deuceline dataset.");
  }

  return validateDataset(await response.json());
}
