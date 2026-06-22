import { z } from 'zod';
import { createAction } from 'nango';

const AppointmentTypeSchema = z.object({
    id: z.number(),
    active: z.union([z.string(), z.boolean()]).optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    duration: z.number().optional(),
    price: z.string().optional(),
    category: z.string().optional(),
    color: z.string().optional(),
    private: z.boolean().optional(),
    type: z.string().optional(),
    classSize: z.number().nullable().optional(),
    paddingAfter: z.number().optional(),
    paddingBefore: z.number().optional(),
    calendarIDs: z.array(z.number()).optional()
});

const InputSchema = z.object({
    includeDeleted: z.boolean().optional().describe('Also include deleted appointment types in the response.')
});

const OutputSchema = z.object({
    items: z.array(AppointmentTypeSchema)
});

const action = createAction({
    description: 'List appointment types.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.acuityscheduling.com/reference/appointment-types
            endpoint: '/appointment-types',
            params: {
                ...(input.includeDeleted !== undefined && { includeDeleted: String(input.includeDeleted) })
            },
            retries: 3
        });

        const parsed = z.array(AppointmentTypeSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse appointment types response',
                details: parsed.error.issues
            });
        }

        return {
            items: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
