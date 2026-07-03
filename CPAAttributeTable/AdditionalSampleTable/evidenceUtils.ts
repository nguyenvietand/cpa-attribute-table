export function splitEvidenceValue(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(';')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function joinEvidenceValues(values: string[]): string {
  return values.map((item) => item.trim()).filter((item) => item.length > 0).join(';');
}

export function mergeEvidenceOptions(
  currentValue: string | undefined,
  evidenceOptions: string[],
): string[] {
  const currentValues = splitEvidenceValue(currentValue);
  const ordered: string[] = [];
  const seen = new Set<string>();

  evidenceOptions
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .forEach((item) => {
      if (seen.has(item)) return;
      seen.add(item);
      ordered.push(item);
    });

  currentValues.forEach((item) => {
    if (seen.has(item)) return;
    seen.add(item);
    ordered.push(item);
  });

  return ordered;
}
