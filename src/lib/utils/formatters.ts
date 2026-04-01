/**
 * Formats a number into Indonesian Rupiah (IDR) currency format.
 * @param num The number to format
 * @returns Formatted currency string (e.g., "Rp 1.000.000")
 */
export const formatIDR = (num: number = 0): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num).replace('Rp', 'Rp');
};

/**
 * Formats a date string (YYYY-MM-DD or ISO) into a readable Indonesian format.
 * @param dateStr The date string to format
 * @param format The format to return ('short', 'long', or 'dd-mm-yyyy')
 * @returns Formatted date string
 */
export const formatDateString = (
  dateStr: string | null | undefined,
  format: 'short' | 'long' | 'dd-mm-yyyy' = 'dd-mm-yyyy'
): string => {
  if (!dateStr) return '-';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  if (format === 'dd-mm-yyyy') {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  }

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: format === 'long' ? 'long' : 'short',
    year: 'numeric'
  });
};
