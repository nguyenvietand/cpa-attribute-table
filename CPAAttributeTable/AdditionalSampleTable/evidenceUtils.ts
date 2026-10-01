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
  const standardSet = new Set(
    evidenceOptions.map((item) => item.trim().toLowerCase())
  );

  // Files currently attached to the row that are NOT in the dropdown list are shown at the top
  currentValues.forEach((item) => {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) return;
    if (!standardSet.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      ordered.push(trimmed);
    }
  });

  // Then append the standard options
  evidenceOptions
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .forEach((item) => {
      const lower = item.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      ordered.push(item);
    });

  // Append any remaining attached files if any
  currentValues.forEach((item) => {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) return;
    seen.add(trimmed.toLowerCase());
    ordered.push(trimmed);
  });

  return ordered;
}
