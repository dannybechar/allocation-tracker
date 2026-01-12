import { DateUtils } from './DateUtils';

describe('DateUtils', () => {
  describe('addDays', () => {
    it('should add positive days', () => {
      const date = new Date(2026, 0, 15); // Jan 15, 2026
      const result = DateUtils.addDays(date, 5);
      expect(result.getDate()).toBe(20);
      expect(result.getMonth()).toBe(0);
      expect(result.getFullYear()).toBe(2026);
    });

    it('should add negative days', () => {
      const date = new Date(2026, 0, 15); // Jan 15, 2026
      const result = DateUtils.addDays(date, -5);
      expect(result.getDate()).toBe(10);
      expect(result.getMonth()).toBe(0);
      expect(result.getFullYear()).toBe(2026);
    });

    it('should handle month boundaries', () => {
      const date = new Date(2026, 0, 30); // Jan 30, 2026
      const result = DateUtils.addDays(date, 5); // Should be Feb 4
      expect(result.getDate()).toBe(4);
      expect(result.getMonth()).toBe(1);
      expect(result.getFullYear()).toBe(2026);
    });

    it('should not mutate original date', () => {
      const date = new Date(2026, 0, 15);
      const originalTime = date.getTime();
      DateUtils.addDays(date, 5);
      expect(date.getTime()).toBe(originalTime);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date(2026, 0, 15, 10, 30);
      const date2 = new Date(2026, 0, 15, 18, 45);
      expect(DateUtils.isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(2026, 0, 15);
      const date2 = new Date(2026, 0, 16);
      expect(DateUtils.isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different months', () => {
      const date1 = new Date(2026, 0, 15);
      const date2 = new Date(2026, 1, 15);
      expect(DateUtils.isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different years', () => {
      const date1 = new Date(2026, 0, 15);
      const date2 = new Date(2027, 0, 15);
      expect(DateUtils.isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2026, 0, 15); // Jan 15, 2026
      expect(DateUtils.formatDate(date)).toBe('2026-01-15');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date(2026, 0, 5); // Jan 5, 2026
      expect(DateUtils.formatDate(date)).toBe('2026-01-05');
    });

    it('should handle December correctly', () => {
      const date = new Date(2026, 11, 31); // Dec 31, 2026
      expect(DateUtils.formatDate(date)).toBe('2026-12-31');
    });
  });

  describe('parseDate', () => {
    it('should parse valid date string', () => {
      const result = DateUtils.parseDate('2026-01-15');
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it('should throw error for invalid format', () => {
      expect(() => DateUtils.parseDate('01/15/2026')).toThrow('Invalid date format');
      expect(() => DateUtils.parseDate('2026-1-15')).toThrow('Invalid date format');
      expect(() => DateUtils.parseDate('2026-01-5')).toThrow('Invalid date format');
    });

    it('should throw error for invalid month', () => {
      expect(() => DateUtils.parseDate('2026-13-15')).toThrow('Invalid month');
      expect(() => DateUtils.parseDate('2026-00-15')).toThrow('Invalid month');
    });

    it('should throw error for invalid day', () => {
      expect(() => DateUtils.parseDate('2026-01-32')).toThrow('Invalid day');
      expect(() => DateUtils.parseDate('2026-01-00')).toThrow('Invalid day');
    });

    it('should throw error for invalid dates like Feb 30', () => {
      expect(() => DateUtils.parseDate('2026-02-30')).toThrow('Invalid date');
    });

    it('should round-trip with formatDate', () => {
      const original = new Date(2026, 0, 15);
      const formatted = DateUtils.formatDate(original);
      const parsed = DateUtils.parseDate(formatted);
      expect(DateUtils.isSameDay(original, parsed)).toBe(true);
    });
  });

  describe('today', () => {
    it('should return today at midnight', () => {
      const result = DateUtils.today();
      const now = new Date();

      expect(result.getFullYear()).toBe(now.getFullYear());
      expect(result.getMonth()).toBe(now.getMonth());
      expect(result.getDate()).toBe(now.getDate());
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('addMonths', () => {
    it('should add positive months', () => {
      const date = new Date(2026, 0, 15); // Jan 15, 2026
      const result = DateUtils.addMonths(date, 3);
      expect(result.getMonth()).toBe(3); // April
      expect(result.getFullYear()).toBe(2026);
      expect(result.getDate()).toBe(15);
    });

    it('should add negative months', () => {
      const date = new Date(2026, 3, 15); // April 15, 2026
      const result = DateUtils.addMonths(date, -2);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getFullYear()).toBe(2026);
      expect(result.getDate()).toBe(15);
    });

    it('should handle year boundaries', () => {
      const date = new Date(2026, 10, 15); // Nov 15, 2026
      const result = DateUtils.addMonths(date, 3);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getFullYear()).toBe(2027);
    });

    it('should not mutate original date', () => {
      const date = new Date(2026, 0, 15);
      const originalTime = date.getTime();
      DateUtils.addMonths(date, 3);
      expect(date.getTime()).toBe(originalTime);
    });
  });

  describe('compare', () => {
    it('should return -1 for date1 < date2', () => {
      const date1 = new Date(2026, 0, 15);
      const date2 = new Date(2026, 0, 16);
      expect(DateUtils.compare(date1, date2)).toBe(-1);
    });

    it('should return 1 for date1 > date2', () => {
      const date1 = new Date(2026, 0, 16);
      const date2 = new Date(2026, 0, 15);
      expect(DateUtils.compare(date1, date2)).toBe(1);
    });

    it('should return 0 for equal dates', () => {
      const date1 = new Date(2026, 0, 15, 10, 30);
      const date2 = new Date(2026, 0, 15, 10, 30);
      expect(DateUtils.compare(date1, date2)).toBe(0);
    });
  });
});
