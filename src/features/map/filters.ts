export type LayerFilter = { min: number | null; max: number | null };

export const EMPTY_FILTER: LayerFilter = { min: null, max: null };

export function parseFilterBound(text: string): number | null {
  const value = text.trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type FilterInputs = {
  filter: LayerFilter;
  active: boolean;
  invalid: boolean;
  inverted: boolean;
};

export function readFilterInputs(minText: string, maxText: string): FilterInputs {
  const min = parseFilterBound(minText);
  const max = parseFilterBound(maxText);
  return {
    filter: { min, max },
    active: min !== null || max !== null,
    invalid: (minText.trim() !== "" && min === null) || (maxText.trim() !== "" && max === null),
    inverted: min !== null && max !== null && min > max,
  };
}

export type LayerFilterSummary = {
  active: boolean;
  matchedIds: string[];
  matched: number;
  missing: number;
  below: number;
  above: number;
  total: number;
};

export function summarizeLayerValues(values: Record<string, number | null>, filter: LayerFilter): LayerFilterSummary {
  const active = filter.min !== null || filter.max !== null;
  const matchedIds: string[] = [];
  let missing = 0;
  let below = 0;
  let above = 0;
  for (const [id, value] of Object.entries(values)) {
    if (value === null || !Number.isFinite(value)) {
      missing += 1;
      continue;
    }
    if (filter.min !== null && value < filter.min) {
      below += 1;
      continue;
    }
    if (filter.max !== null && value > filter.max) {
      above += 1;
      continue;
    }
    matchedIds.push(id);
  }
  return { active, matchedIds, matched: matchedIds.length, missing, below, above, total: Object.keys(values).length };
}
