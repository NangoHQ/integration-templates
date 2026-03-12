import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().optional().describe('User ID to fetch DND status for. If omitted, returns status for the authenticated user. Example: "U1234567890"')
});

const OutputSchema = z.object({
    dnd_enabled: z.boolean().describe('Whether Do Not Disturb is enabled'),
    next_dnd_start_ts: z.union([z.number(), z.null()]).describe('Unix timestamp for the next DND window start. Null if no DND window scheduled'),
    next_dnd_end_ts: z.union([z.number(), z.null()]).describe('Unix timestamp for the next DND window end. Null if no DND window scheduled'),
    snooze_enabled: z.boolean().describe('Whether snooze mode is currently enabled'),
    snooze_endtime: z.union([z.number(), z.null()]).describe('Unix timestamp when snooze will end. Null if snooze is not enabled'),
    snooze_remaining: z.union([z.number(), z.null()]).describe('Seconds remaining until snooze ends. Null if snooze is not enabled'),
    snooze_is_indefinite: z.union([z.boolean(), z.null()]).describe('Whether snooze is indefinite. Null if snooze is not enabled')
});

const action = createAction({
    description: "Get a user's Do Not Disturb status and next scheduled DND window",
    version: '1.0.0',

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
            next_dnd_start_ts: data.next_dnd_start_ts ?? null,
            next_dnd_end_ts: data.next_dnd_end_ts ?? null,
            snooze_enabled: data.snooze_enabled ?? false,
            snooze_endtime: data.snooze_endtime ?? null,
            snooze_remaining: data.snooze_remaining ?? null,
            snooze_is_indefinite: data.snooze_is_indefinite ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
