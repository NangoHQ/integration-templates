import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    request_id: z.string().describe('The ID of the time off request to delete. Example: "12345"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    request_id: z.string()
});

const action = createAction({
    description: 'Delete or archive a time off request in BambooHR by canceling it.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-time-off-request',
        group: 'Time Off'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.put({
            // https://documentation.bamboohr.com/reference/update-time-off-request-status
            endpoint: `/v1/time_off/requests/${encodeURIComponent(input.request_id)}/status`,
            data: {
                status: 'canceled'
            },
            headers: {
                Accept: 'application/json'
            },
            retries: 10
        });

        return {
            success: true,
            request_id: input.request_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
