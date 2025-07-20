// Lightweight date utility functions to replace moment.js
// This reduces bundle size significantly

export interface DateFormatOptions {
  locale?: string;
  timeZone?: string;
}

/**
 * Format date to readable string
 */
export const formatDate = (
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium',
  options?: DateFormatOptions
): string => {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: options?.timeZone,
  };

  switch (format) {
    case 'short':
      formatOptions.dateStyle = 'short';
      break;
    case 'medium':
      formatOptions.dateStyle = 'medium';
      break;
    case 'long':
      formatOptions.dateStyle = 'long';
      break;
    case 'full':
      formatOptions.dateStyle = 'full';
      break;
  }

  return new Intl.DateTimeFormat(options?.locale || 'en-US', formatOptions).format(dateObj);
};

/**
 * Format time to readable string
 */
export const formatTime = (
  date: Date | string | number,
  format: '12h' | '24h' = '12h',
  options?: DateFormatOptions
): string => {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Time';
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: format === '12h',
    timeZone: options?.timeZone,
  };

  return new Intl.DateTimeFormat(options?.locale || 'en-US', formatOptions).format(dateObj);
};

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 */
export const getRelativeTime = (
  date: Date | string | number,
  options?: DateFormatOptions
): string => {
  const dateObj = new Date(date);
  const now = new Date();
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  const absDiff = Math.abs(diffInSeconds);

  // Define time units in seconds
  const units = [
    { name: 'year', seconds: 31536000 },
    { name: 'month', seconds: 2592000 },
    { name: 'week', seconds: 604800 },
    { name: 'day', seconds: 86400 },
    { name: 'hour', seconds: 3600 },
    { name: 'minute', seconds: 60 },
    { name: 'second', seconds: 1 },
  ];

  for (const unit of units) {
    const count = Math.floor(absDiff / unit.seconds);
    if (count >= 1) {
      const rtf = new Intl.RelativeTimeFormat(options?.locale || 'en-US', { numeric: 'auto' });
      return rtf.format(diffInSeconds > 0 ? -count : count, unit.name as Intl.RelativeTimeFormatUnit);
    }
  }

  return 'just now';
};

/**
 * Check if date is today
 */
export const isToday = (date: Date | string | number): boolean => {
  const dateObj = new Date(date);
  const today = new Date();
  
  return dateObj.toDateString() === today.toDateString();
};

/**
 * Check if date is yesterday
 */
export const isYesterday = (date: Date | string | number): boolean => {
  const dateObj = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return dateObj.toDateString() === yesterday.toDateString();
};

/**
 * Check if date is this week
 */
export const isThisWeek = (date: Date | string | number): boolean => {
  const dateObj = new Date(date);
  const now = new Date();
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return dateObj >= startOfWeek && dateObj <= endOfWeek;
};

/**
 * Add time to date
 */
export const addTime = (
  date: Date | string | number,
  amount: number,
  unit: 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds'
): Date => {
  const dateObj = new Date(date);
  
  switch (unit) {
    case 'years':
      dateObj.setFullYear(dateObj.getFullYear() + amount);
      break;
    case 'months':
      dateObj.setMonth(dateObj.getMonth() + amount);
      break;
    case 'weeks':
      dateObj.setDate(dateObj.getDate() + (amount * 7));
      break;
    case 'days':
      dateObj.setDate(dateObj.getDate() + amount);
      break;
    case 'hours':
      dateObj.setHours(dateObj.getHours() + amount);
      break;
    case 'minutes':
      dateObj.setMinutes(dateObj.getMinutes() + amount);
      break;
    case 'seconds':
      dateObj.setSeconds(dateObj.getSeconds() + amount);
      break;
  }
  
  return dateObj;
};

/**
 * Get start of day
 */
export const startOfDay = (date: Date | string | number): Date => {
  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
};

/**
 * Get end of day
 */
export const endOfDay = (date: Date | string | number): Date => {
  const dateObj = new Date(date);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
};

/**
 * Parse ISO string to Date
 */
export const parseISO = (dateString: string): Date => {
  return new Date(dateString);
};

/**
 * Format date to ISO string
 */
export const toISOString = (date: Date | string | number): string => {
  return new Date(date).toISOString();
};

/**
 * Get difference between two dates
 */
export const getDifference = (
  date1: Date | string | number,
  date2: Date | string | number,
  unit: 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds' = 'days'
): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffInMs = Math.abs(d1.getTime() - d2.getTime());
  
  switch (unit) {
    case 'years':
      return Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 365));
    case 'months':
      return Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 30));
    case 'weeks':
      return Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 7));
    case 'days':
      return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    case 'hours':
      return Math.floor(diffInMs / (1000 * 60 * 60));
    case 'minutes':
      return Math.floor(diffInMs / (1000 * 60));
    case 'seconds':
      return Math.floor(diffInMs / 1000);
    default:
      return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  }
};