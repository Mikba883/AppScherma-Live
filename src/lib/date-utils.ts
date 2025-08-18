/**
 * Converts an ISO date string to Italian format (DD/MM/YYYY)
 */
export const formatDateItalian = (dateString: string | null): string => {
  if (!dateString) return 'Mai';
  return new Date(dateString).toLocaleDateString('it-IT');
};

/**
 * Converts an ISO date string to Italian format for display in tables
 */
export const formatDateForTable = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('it-IT');
};

/**
 * Creates a Date object from a date string without timezone issues
 * Ensures the date is interpreted as local time
 */
export const createLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
};

/**
 * Converts a Date object to YYYY-MM-DD format for database storage
 * Uses local time to avoid timezone shifts
 */
export const formatDateForStorage = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};