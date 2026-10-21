/**
 * Currency, weight, and date/time formatting utilities using native Intl APIs
 */

export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatIndianTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '';
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
    if (isNaN(date.getTime())) return dateString;
    const locale = lang === 'ta' ? 'ta-IN' : 'en-IN';
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Just now';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Just now';
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatReadableDate(dateString);
  } catch {
    return 'Just now';
  }
};

export default {
  formatCurrency,
  formatIndianTime,
  formatGrams,
  formatReadableDate,
  formatRelativeTime,
};
