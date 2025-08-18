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