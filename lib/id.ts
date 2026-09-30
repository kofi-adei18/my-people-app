export function uid(prefix: string): string {
  return crypto.randomUUID?.() ?? `${prefix}-${Date.now()}`;
}

export function stamp(): number {
  return Date.now();
}