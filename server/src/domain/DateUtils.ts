/**
 * DateUtils - Utility class for consistent date handling
 *
 * All dates are treated as local timezone without time component.
 * Dates are stored and transmitted as ISO strings (YYYY-MM-DD).
 */
export class DateUtils {
  /**
   * Adds days to a date, returning a new Date object
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Checks if two dates are the same calendar day
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Formats date as ISO string (YYYY-MM-DD)
   */
  static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Parses ISO date string (YYYY-MM-DD) to Date
   * @throws Error if format is invalid
   */
  static parseDate(dateStr: string): Date {
    const regex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateStr.match(regex);

    if (!match) {
      throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
    }

    const [, yearStr, monthStr, dayStr] = match;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // Validate month and day ranges
    if (month < 1 || month > 12) {
      throw new Error(`Invalid month: ${month}`);
    }
    if (day < 1 || day > 31) {
      throw new Error(`Invalid day: ${day}`);
    }

    const date = new Date(year, month - 1, day);

    // Verify the date is valid (handles invalid dates like Feb 30)
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new Error(`Invalid date: ${dateStr}`);
    }

    return date;
  }

  /**
   * Returns today at midnight (local timezone)
   */
  static today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * Adds months to a date (for default 3-month window)
   */
  static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Compares two dates (returns -1, 0, or 1)
   */
  static compare(date1: Date, date2: Date): number {
    const time1 = date1.getTime();
    const time2 = date2.getTime();
    return time1 < time2 ? -1 : time1 > time2 ? 1 : 0;
  }
}
