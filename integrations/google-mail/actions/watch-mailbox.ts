import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    topicName: z.string().describe('The name of the Cloud Pub/Sub topic to use for notifications. Format: projects/{project}/topics/{topic}'),
    labelIds: z
        .array(z.string())
        .optional()
        .describe(
            'List of label IDs to filter on for push notifications. If specified, only changes to messages with these labels will trigger notifications.'
        ),
    labelFilterBehavior: z
        .enum(['include', 'exclude'])
        .optional()
        .describe(
            'How to treat the labelIds filter. "include" means only labels in labelIds will trigger notifications. "exclude" means all labels except those in labelIds will trigger notifications.'
        )
});

const ProviderWatchResponseSchema = z.object({
    historyId: z.string().describe('The ID of the mailbox history record at which the watch was started.'),
    expiration: z.string().describe('The expiration time of the watch as a timestamp in milliseconds.')
});

const OutputSchema = z.object({
    historyId: z.string().describe('The ID of the mailbox history record at which the watch was started.'),
    expiration: z.string().describe('The expiration time of the watch as a timestamp in milliseconds.')
});

const action = createAction({
    description: 'Start Gmail push notifications for mailbox changes.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/watch-mailbox',
        group: 'Watch'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/watch
        const response = await nango.post({
            endpoint: '/gmail/v1/users/me/watch',
            data: {
                topicName: input.topicName,
                ...(input.labelIds !== undefined && { labelIds: input.labelIds }),
                ...(input.labelFilterBehavior !== undefined && { labelFilterBehavior: input.labelFilterBehavior })
            },
            retries: 3
        });

        const watchResponse = ProviderWatchResponseSchema.parse(response.data);

        return {
            historyId: watchResponse.historyId,
            expiration: watchResponse.expiration
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
