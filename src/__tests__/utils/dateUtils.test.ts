import { 
  formatDate, 
  formatRelativeTime, 
  isValidDate, 
  parseDate,
  addDays,
  subtractDays,
  isSameDay,
  isToday,
  isYesterday,
  getTimeAgo
} from '../../utils/dateUtils';

describe('dateUtils', () => {
  const mockDate = new Date('2023-12-15T10:30:00Z');
  
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatDate', () => {
    it('should format date with default format', () => {
      const date = new Date('2023-12-15T10:30:00Z');
      const result = formatDate(date);
      
      expect(result).toBe('Dec 15, 2023');
    });

    it('should format date with custom format', () => {
      const date = new Date('2023-12-15T10:30:00Z');
      const result = formatDate(date, 'YYYY-MM-DD');
      
      expect(result).toBe('2023-12-15');
    });

    it('should handle invalid date', () => {
      const result = formatDate(new Date('invalid'));
      
      expect(result).toBe('Invalid Date');
    });

    it('should format with time', () => {
      const date = new Date('2023-12-15T10:30:00Z');
      const result = formatDate(date, 'MMM DD, YYYY HH:mm');
      
      expect(result).toBe('Dec 15, 2023 10:30');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "just now" for recent dates', () => {
      const recentDate = new Date(mockDate.getTime() - 30000); // 30 seconds ago
      const result = formatRelativeTime(recentDate);
      
      expect(result).toBe('just now');
    });

    it('should return minutes ago', () => {
      const minutesAgo = new Date(mockDate.getTime() - 5 * 60 * 1000); // 5 minutes ago
      const result = formatRelativeTime(minutesAgo);
      
      expect(result).toBe('5 minutes ago');
    });

    it('should return hours ago', () => {
      const hoursAgo = new Date(mockDate.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      const result = formatRelativeTime(hoursAgo);
      
      expect(result).toBe('2 hours ago');
    });

    it('should return days ago', () => {
      const daysAgo = new Date(mockDate.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const result = formatRelativeTime(daysAgo);
      
      expect(result).toBe('3 days ago');
    });

    it('should return formatted date for old dates', () => {
      const oldDate = new Date(mockDate.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const result = formatRelativeTime(oldDate);
      
      expect(result).toBe('Dec 5, 2023');
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      const validDate = new Date('2023-12-15');
      
      expect(isValidDate(validDate)).toBe(true);
    });

    it('should return false for invalid dates', () => {
      const invalidDate = new Date('invalid');
      
      expect(isValidDate(invalidDate)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isValidDate(null as any)).toBe(false);
      expect(isValidDate(undefined as any)).toBe(false);
    });
  });

  describe('parseDate', () => {
    it('should parse ISO string', () => {
      const isoString = '2023-12-15T10:30:00Z';
      const result = parseDate(isoString);
      
      expect(result).toEqual(new Date(isoString));
    });

    it('should parse timestamp', () => {
      const timestamp = 1702636200000;
      const result = parseDate(timestamp);
      
      expect(result).toEqual(new Date(timestamp));
    });

    it('should return null for invalid input', () => {
      const result = parseDate('invalid date');
      
      expect(result).toBeNull();
    });

    it('should handle Date objects', () => {
      const date = new Date('2023-12-15');
      const result = parseDate(date);
      
      expect(result).toEqual(date);
    });
  });

  describe('addDays', () => {
    it('should add days to date', () => {
      const date = new Date('2023-12-15');
      const result = addDays(date, 5);
      
      expect(result).toEqual(new Date('2023-12-20'));
    });

    it('should handle negative days', () => {
      const date = new Date('2023-12-15');
      const result = addDays(date, -5);
      
      expect(result).toEqual(new Date('2023-12-10'));
    });

    it('should handle month boundaries', () => {
      const date = new Date('2023-12-30');
      const result = addDays(date, 5);
      
      expect(result).toEqual(new Date('2024-01-04'));
    });
  });

  describe('subtractDays', () => {
    it('should subtract days from date', () => {
      const date = new Date('2023-12-15');
      const result = subtractDays(date, 5);
      
      expect(result).toEqual(new Date('2023-12-10'));
    });

    it('should handle month boundaries', () => {
      const date = new Date('2023-12-05');
      const result = subtractDays(date, 10);
      
      expect(result).toEqual(new Date('2023-11-25'));
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date('2023-12-15T10:30:00Z');
      const date2 = new Date('2023-12-15T15:45:00Z');
      
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2023-12-15T10:30:00Z');
      const date2 = new Date('2023-12-16T10:30:00Z');
      
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should handle timezone differences', () => {
      const date1 = new Date('2023-12-15T23:30:00Z');
      const date2 = new Date('2023-12-16T01:30:00+02:00');
      
      expect(isSameDay(date1, date2)).toBe(true);
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date(mockDate);
      
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date(mockDate.getTime() - 24 * 60 * 60 * 1000);
      
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date(mockDate.getTime() + 24 * 60 * 60 * 1000);
      
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('should return true for yesterday', () => {
      const yesterday = new Date(mockDate.getTime() - 24 * 60 * 60 * 1000);
      
      expect(isYesterday(yesterday)).toBe(true);
    });

    it('should return false for today', () => {
      const today = new Date(mockDate);
      
      expect(isYesterday(today)).toBe(false);
    });

    it('should return false for two days ago', () => {
      const twoDaysAgo = new Date(mockDate.getTime() - 2 * 24 * 60 * 60 * 1000);
      
      expect(isYesterday(twoDaysAgo)).toBe(false);
    });
  });

  describe('getTimeAgo', () => {
    it('should return seconds ago', () => {
      const secondsAgo = new Date(mockDate.getTime() - 30 * 1000);
      const result = getTimeAgo(secondsAgo);
      
      expect(result).toBe('30s');
    });

    it('should return minutes ago', () => {
      const minutesAgo = new Date(mockDate.getTime() - 5 * 60 * 1000);
      const result = getTimeAgo(minutesAgo);
      
      expect(result).toBe('5m');
    });

    it('should return hours ago', () => {
      const hoursAgo = new Date(mockDate.getTime() - 2 * 60 * 60 * 1000);
      const result = getTimeAgo(hoursAgo);
      
      expect(result).toBe('2h');
    });

    it('should return days ago', () => {
      const daysAgo = new Date(mockDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      const result = getTimeAgo(daysAgo);
      
      expect(result).toBe('3d');
    });

    it('should return weeks ago', () => {
      const weeksAgo = new Date(mockDate.getTime() - 2 * 7 * 24 * 60 * 60 * 1000);
      const result = getTimeAgo(weeksAgo);
      
      expect(result).toBe('2w');
    });

    it('should return months ago', () => {
      const monthsAgo = new Date(mockDate.getTime() - 2 * 30 * 24 * 60 * 60 * 1000);
      const result = getTimeAgo(monthsAgo);
      
      expect(result).toBe('2mo');
    });

    it('should return years ago', () => {
      const yearsAgo = new Date(mockDate.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
      const result = getTimeAgo(yearsAgo);
      
      expect(result).toBe('2y');
    });
  });

  describe('Edge cases', () => {
    it('should handle leap years', () => {
      const leapYear = new Date('2024-02-29');
      const result = addDays(leapYear, 1);
      
      expect(result).toEqual(new Date('2024-03-01'));
    });

    it('should handle daylight saving time transitions', () => {
      // This test would be more complex and depend on timezone
      const date = new Date('2023-03-12T02:00:00'); // DST transition in US
      const result = addDays(date, 1);
      
      expect(isValidDate(result)).toBe(true);
    });

    it('should handle very old dates', () => {
      const oldDate = new Date('1900-01-01');
      const result = formatDate(oldDate);
      
      expect(result).toBe('Jan 1, 1900');
    });

    it('should handle future dates', () => {
      const futureDate = new Date('2100-12-31');
      const result = formatDate(futureDate);
      
      expect(result).toBe('Dec 31, 2100');
    });
  });
});