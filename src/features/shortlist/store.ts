export function readShortlist(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))].slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function toggleShortlist(ids: string[], id: string): string[] {
  const unique = [...new Set(ids)];
  return unique.includes(id) ? unique.filter((value) => value !== id) : [...unique, id].slice(0, 20);
}

export function removeFromShortlist(ids: string[], id: string): string[] {
  return [...new Set(ids)].filter((value) => value !== id);
}

export function selectForComparison(ids: string[]): string[] {
  return [...new Set(ids)].slice(0, 3);
}
