import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().optional().describe('User ID to fetch DND status for. If omitted, returns status for the authenticated user. Example: "U1234567890"')
});

const OutputSchema = z.object({
    dnd_enabled: z.boolean().describe('Whether Do Not Disturb is enabled'),
    next_dnd_start_ts: z.number().optional().describe('Unix timestamp for the next DND window start. Omitted if no DND window scheduled'),
    next_dnd_end_ts: z.number().optional().describe('Unix timestamp for the next DND window end. Omitted if no DND window scheduled'),
    snooze_enabled: z.boolean().describe('Whether snooze mode is currently enabled'),
    snooze_endtime: z.number().optional().describe('Unix timestamp when snooze will end. Omitted if snooze is not enabled'),
    snooze_remaining: z.number().optional().describe('Seconds remaining until snooze ends. Omitted if snooze is not enabled'),
    snooze_is_indefinite: z.boolean().optional().describe('Whether snooze is indefinite. Omitted if snooze is not enabled')
});

const action = createAction({
    description: "Get a user's Do Not Disturb status and next scheduled DND window",
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-dnd-info',
        group: 'DND'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['dnd:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.slack.dev/reference/methods/dnd.info/
        const config = {
            endpoint: 'dnd.info',
            params: input.user_id ? { user: input.user_id } : {},
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || response.data.ok !== true) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to retrieve DND info',
                user_id: input.user_id
            });
        }

        const data = response.data;

        return {
            dnd_enabled: data.dnd_enabled ?? false,
            next_dnd_start_ts: data.next_dnd_start_ts ?? undefined,
            next_dnd_end_ts: data.next_dnd_end_ts ?? undefined,
            snooze_enabled: data.snooze_enabled ?? false,
            snooze_endtime: data.snooze_endtime ?? undefined,
            snooze_remaining: data.snooze_remaining ?? undefined,
            snooze_is_indefinite: data.snooze_is_indefinite ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
