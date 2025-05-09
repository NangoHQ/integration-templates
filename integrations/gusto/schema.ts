import { z } from 'zod';
import { gustoCreateEmployeeSchema as GustoCreate, gustoUpdateEmployeeSchema as GustoUpdate } from './schema.zod.js';

const FormattedDate = z
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
    dateOfBirth: FormattedDate
});

export const GustoUpdateEmployeeSchema = GustoUpdate.extend({
    dateOfBirth: FormattedDate
});
