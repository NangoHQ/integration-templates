import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    requestId: z.number().describe('The ID of the time off request to update. Example: 1686'),
    status: z.enum(['approved', 'denied', 'declined', 'canceled', 'cancelled']).describe('The new status for the time off request.'),
    note: z.string().optional().describe('A note to attach to the change in status.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    requestId: z.number(),
    status: z.string(),
    note: z.string().optional()
});

const action = createAction({
    description: 'Update a time off request in BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-time-off-request',
        group: 'Time Off'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['time_off.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: { status: string; note?: string } = {
            status: input.status
        };

        if (input.note !== undefined) {
            data.note = input.note;
        }

        // https://documentation.bamboohr.com/reference/update-time-off-request-status
        await nango.put({
            endpoint: `/v1/time_off/requests/${encodeURIComponent(String(input.requestId))}/status`,
            data,
            retries: 3
        });

        return {
            success: true,
            requestId: input.requestId,
            status: input.status,
            ...(input.note !== undefined && { note: input.note })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
