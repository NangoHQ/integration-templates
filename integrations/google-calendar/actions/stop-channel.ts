import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('A UUID or similar unique string that identifies this channel. Example: "01234567-89ab-cdef-0123456789ab"'),
    resourceId: z.string().describe('An opaque ID that identifies the resource being watched on this channel. Stable across different API versions.'),
    token: z.string().optional().describe('An arbitrary string delivered to the target address with each notification delivered over this channel. Optional.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Stop push notifications for a channel',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/stop-channel',
        group: 'Channels'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/channels/stop
        const response = await nango.post({
            endpoint: '/calendar/v3/channels/stop',
            data: {
                id: input.id,
                resourceId: input.resourceId,
                ...(input.token && { token: input.token })
            },
            retries: 3
        });

        // The API returns 204 No Content on success
        if (response.status === 200 || response.status === 204) {
            return { success: true };
        }

        throw new nango.ActionError({
            type: 'stop_channel_failed',
            message: `Failed to stop channel: ${response.status} ${response.statusText}`
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
