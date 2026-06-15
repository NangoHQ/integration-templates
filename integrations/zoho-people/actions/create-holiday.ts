import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Holiday name. Example: "Independence Day"'),
    from: z.string().describe('Start date in dd-MMM-yyyy format. Example: "15-Jun-2026"'),
    to: z.string().describe('End date in dd-MMM-yyyy format. Example: "15-Jun-2026"'),
    holidayType: z.enum(['Mandatory', 'Optional']).describe('Holiday type. Example: "Mandatory"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Create a holiday entry.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-holiday',
        group: 'Holidays'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/people/api/overview.html
        await nango.post({
            endpoint: '/api/v2/leavetracker/holidays',
            params: {
                name: input.name,
                from: input.from,
                to: input.to,
                holidayType: input.holidayType
            },
            data: '',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
