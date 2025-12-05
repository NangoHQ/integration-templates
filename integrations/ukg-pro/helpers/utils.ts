export const parseDate = (date: string | null | undefined): string => {
    if (!date) return '';
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};
