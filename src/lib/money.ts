/**
 * Nearbligo Money Helpers (Section 7.2 of Build Spec)
 *
 * Money is stored and calculated as integer cents (minor units).
 * Payments use USDT on NEAR (6 decimals), so:
 *   1 USD cent = 10,000 raw units.
 * Never use floats for monetary calculations.
 */

export function centsToUnits(cents: number | bigint): string {
  const c = typeof cents === "bigint" ? cents : BigInt(Math.round(cents));
  return (c * 10000n).toString();
}

export function unitsToCents(units: string | bigint): number {
  const u = typeof units === "bigint" ? units : BigInt(units || "0");
  return Number(u / 10000n);
}

export function formatCents(cents: number | bigint): string {
  const c = typeof cents === "bigint" ? Number(cents) : cents;
  const dollars = Math.floor(c / 100);
  const remainder = Math.abs(c % 100);
  return `$${dollars}.${remainder.toString().padStart(2, "0")}`;
}

export function parseDollarsToCents(dollarStr: string): number {
  const cleaned = dollarStr.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const dollars = parseInt(parts[0] || "0", 10);
  const cents = parts[1] ? parseInt(parts[1].padEnd(2, "0").slice(0, 2), 10) : 0;
  return dollars * 100 + cents;
}
