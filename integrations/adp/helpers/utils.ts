export const parseDate = (date: string | undefined): string => {
  if (!date) return "";
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? "" : parsed.toISOString();
};
