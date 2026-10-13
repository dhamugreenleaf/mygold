/**
 * MyGold Mobile - Pure Formatting Utilities
 * 
 * Provides Indian locale currency and bullion weight formatting.
 */

export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    const formatted = Math.abs(num).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return num < 0 ? `-₹${formatted}` : `₹${formatted}`;
  }
};

export const formatGrams = (grams, lang = 'en') => {
  const num = Number(grams) || 0;
  const unit = lang === 'ta' ? 'கிராம்' : 'g';
  const decimals = (grams?.toString().split('.')[1] || '').length;
  const formattedNum = decimals > 2 ? num.toFixed(3) : num.toFixed(2);
  return `${formattedNum} ${unit}`;
};

export const formatReadableDate = (dateString, lang = 'en') => {
  if (!dateString) return lang === 'ta' ? 'இல்லை' : 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    const locale = lang === 'ta' ? 'ta-IN' : 'en-IN';
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateString);
  }
};

export default {
  formatCurrency,
  formatGrams,
  formatReadableDate,
};
