import { z } from 'zod';
import { ticketCreateSchema as TicketCreate } from './schema.zod.js';

const ISO8601String = z
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
        return date.toISOString();
    });

export const TicketCreateSchema = TicketCreate.extend({
    ticket: z
        .object({
            comment: z
                .object({
                    body: z.string().optional(),
                    html_body: z.string().optional()
                })
                .refine(
                    (data) => {
                        return !!data.body || !!data.html_body;
                    },
                    {
                        message: 'Either body or html_body must be provided'
                    }
                ),
            due_at: ISO8601String
        })
        .passthrough()
});
