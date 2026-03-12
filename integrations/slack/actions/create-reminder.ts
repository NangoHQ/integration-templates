import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    text: z.string().describe('The content of the reminder. Example: "eat a banana"'),
    time: z
        .union([z.string(), z.number()])
        .describe('When the reminder should happen. Can be a Unix timestamp or natural language like "in 5 minutes", "tomorrow at 9am"'),
    user_id: z
        .string()
        .optional()
        .describe(
            'The user ID to set the reminder for. If omitted, sets a reminder for the authenticated user. Note: Setting reminders for other users requires a bot token.'
        )
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the reminder'),
    creator: z.string().describe('The user ID of the user who created the reminder'),
    user: z.string().describe('The user ID of the user the reminder is set for'),
    text: z.string().describe('The content of the reminder'),
    recurring: z.boolean().describe('Whether the reminder is recurring'),
    time: z.number().optional().describe('The Unix timestamp when the reminder will trigger (for non-recurring reminders)'),
    complete_ts: z.number().optional().describe('The Unix timestamp when the reminder was completed (0 if not completed)')
});

const action = createAction({
    description: 'Create a reminder for a user',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-reminder',
        group: 'Reminders'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['reminders:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.slack.dev/reference/methods/reminders.add
        const response = await nango.post({
            endpoint: 'reminders.add',
            data: {
                text: input.text,
                time: input.time,
                ...(input.user_id && { user: input.user_id })
            },
            retries: 10 // Non-idempotent POST, avoid retries
        });

        if (!response.data || response.data.ok !== true) {
            throw new nango.ActionError({
                type: 'slack_api_error',
                message: response.data?.error || 'Failed to create reminder',
                slack_response: response.data
            });
        }

        const reminder = response.data.reminder;

        return {
            id: reminder.id,
            creator: reminder.creator,
            user: reminder.user,
            text: reminder.text,
            recurring: reminder.recurring,
            time: reminder.time,
            complete_ts: reminder.complete_ts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
