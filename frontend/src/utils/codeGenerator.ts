export function generateObjectCode(sourceName: string, fallbackPrefix: string, usedCodes: Iterable<string>) {
  const normalizedName = normalizeObjectCode(sourceName);
  if (normalizedName) {
    return uniqueCode(normalizedName, usedCodes);
  }

  const usedSet = new Set(Array.from(usedCodes, (code) => code.toUpperCase()));
  for (let index = 1; index <= 9999; index += 1) {
    const candidate = `${fallbackPrefix}_${String(index).padStart(3, '0')}`;
    if (!usedSet.has(candidate)) {
      return candidate;
    }
  }

  return uniqueCode(fallbackPrefix, usedCodes);
}

export function normalizeObjectCode(value: string) {
  return value
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function uniqueCode(base: string, usedCodes: Iterable<string>) {
  const usedSet = new Set(Array.from(usedCodes, (code) => code.toUpperCase()));
  if (!usedSet.has(base)) {
    return base;
  }

  for (let index = 2; index <= 9999; index += 1) {
    const suffix = `_${index}`;
    const candidate = `${base.slice(0, 64 - suffix.length).replace(/_+$/g, '')}${suffix}`;
    if (!usedSet.has(candidate)) {
      return candidate;
    }
  }

  return base;
}
