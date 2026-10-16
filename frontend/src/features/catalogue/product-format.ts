export const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'USD', currencyDisplay: 'code' });
export const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });

export function formatCents(cents: number): string {
  const value = BigInt(cents);
  const fraction = (value % BigInt(100)).toString().padStart(2, '0');
  // Format whole dollars without converting a large cent total to floating point.
  return money.formatToParts(value / BigInt(100))
    .map(part => part.type === 'fraction' ? fraction : part.value).join('');
}
