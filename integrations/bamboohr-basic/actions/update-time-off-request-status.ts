import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    requestId: z.string().describe('The ID of the time off request to update. Example: "123"'),
    status: z.enum(['approved', 'denied', 'declined', 'canceled', 'cancelled']).describe('The new status for the time off request.'),
    note: z.string().optional().describe('A note to attach to the change in status.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    requestId: z.string(),
    status: z.string()
});

const action = createAction({
    description: 'Approve, deny, or cancel a time off request in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['time_off.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.put({
            // https://documentation.bamboohr.com/reference/update-time-off-request-status
            endpoint: `/v1/time_off/requests/${encodeURIComponent(input.requestId)}/status`,
            data: {
                status: input.status,
                ...(input.note !== undefined && { note: input.note })
            },
            retries: 3
        });

        return {
            success: true,
            requestId: input.requestId,
            status: input.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
