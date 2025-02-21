import type { NangoAction } from '../../models';

/**
 * Validates and converts a date string to ISO format.
 *
 * @param date - The date string to validate and convert.
 * @returns The ISO string representation of the date.
 * @throws {nango.ActionError} If the date string is invalid.
 */
export const validateAndConvertDate = (nango: NangoAction, date: any): string => {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        throw new nango.ActionError({
            message: 'Invalid date format',
            errors: [{ message: `The date ${date} is not valid.` }]
        });
    }
    return parsedDate.toISOString();
};
