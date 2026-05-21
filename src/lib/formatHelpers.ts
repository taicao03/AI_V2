export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return Math.trunc(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseNumberInput(str: string): number {
  const cleaned = str.replace(/[^\d]/g, '');
  if (!cleaned) {
    return 0;
  }
  const parsed = parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
