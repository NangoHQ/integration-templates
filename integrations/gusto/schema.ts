import { z } from 'zod';
import { createEmployeeSchema as GustoCreate } from './schema.zod.js';

const FormatteDate = z
    .string()
    .optional()
    .refine(
        (data) => {
            if (!data) return true;

            const date = new Date(data);
            return !isNaN(date.getTime());
        },
        {
            message: 'Invalid date format, expected a valid date'
        }
    )
    .transform((data) => {
        if (!data) return data;

        const date = new Date(data);
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    });

export const GustoCreateEmployeeSchema = GustoCreate.extend({
    dateOfBirth: FormatteDate
});
