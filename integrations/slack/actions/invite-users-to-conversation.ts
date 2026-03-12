import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The ID of the public or private channel to invite user(s) to. Example: "C024BE91L"'),
    user_ids: z
        .array(z.string())
        .describe('Array of user IDs to invite to the channel. Up to 1000 users may be invited at once. Example: ["U024BE7LH", "U12345678"]'),
    force: z
        .boolean()
        .optional()
        .describe('When set to true and multiple user IDs are provided, continue inviting the valid ones while ignoring invalid IDs. Defaults to false.')
});

const OutputSchema = z.object({
    ok: z.boolean(),
    channel: z.any().optional(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Invite users to a Slack channel',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/invite-users-to-conversation',
        group: 'Channels'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:manage', 'groups:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.user_ids.length > 1000) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Cannot invite more than 1000 users at once'
            });
        }

        const response = await nango.post({
            // https://api.slack.com/methods/conversations.invite
            endpoint: 'conversations.invite',
            data: {
                channel: input.channel_id,
                users: input.user_ids.join(','),
                ...(input.force !== undefined && { force: input.force })
            },
            retries: 10
        });

        const data = response.data as z.infer<typeof OutputSchema>;

        if (!data.ok) {
            throw new nango.ActionError({
                type: 'slack_api_error',
                message: data.error || 'Unknown error from Slack API',
                channel_id: input.channel_id,
                user_ids: input.user_ids
            });
        }

        return {
            ok: data.ok,
            channel: data.channel
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
