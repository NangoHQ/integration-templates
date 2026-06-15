import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from: z.string().describe('Start date in dd-MMM-yyyy format. Example: "01-Jan-2026"'),
    to: z.string().describe('End date in dd-MMM-yyyy format. Example: "31-Jan-2026"')
});

const HolidaySchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        holidayType: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    holidays: z.array(HolidaySchema),
    status: z.string()
});

const action = createAction({
    description: 'List configured holidays within a date range',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-holidays',
        group: 'Holidays'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoPeople.leavetracker.ALL'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/people/api/overview.html
            endpoint: '/api/v2/leavetracker/holidays',
            params: {
                from: input.from,
                to: input.to
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
