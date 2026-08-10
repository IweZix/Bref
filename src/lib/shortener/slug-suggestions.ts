/** Deterministic alternatives shown when a requested slug isn't available. */
export function suggestSlugAlternatives(base: string, count = 3): string[] {
  const suggestions: string[] = [];
  for (let suffix = 2; suggestions.length < count; suffix++) {
    suggestions.push(`${base}-${suffix}`);
  }
  return suggestions;
}
