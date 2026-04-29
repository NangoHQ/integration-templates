import { createSync } from 'nango';
import { z } from 'zod';

// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels#Label
const ProviderLabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    messageListVisibility: z.enum(['hide', 'show']).optional(),
    labelListVisibility: z.enum(['labelHide', 'labelShow', 'labelShowIfUnread']).optional(),
    type: z.enum(['system', 'user']).optional(),
    messagesTotal: z.number().int().optional(),
    messagesUnread: z.number().int().optional(),
    threadsTotal: z.number().int().optional(),
    threadsUnread: z.number().int().optional()
});

const LabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    messageListVisibility: z.enum(['hide', 'show']).optional(),
    labelListVisibility: z.enum(['labelHide', 'labelShow', 'labelShowIfUnread']).optional(),
    type: z.enum(['system', 'user']).optional(),
    messagesTotal: z.number().int().optional(),
    messagesUnread: z.number().int().optional(),
    threadsTotal: z.number().int().optional(),
    threadsUnread: z.number().int().optional()
});

const sync = createSync({
    description: 'Sync built-in and user-created Gmail labels.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Label: LabelSchema
    },
    endpoints: [
        {
            path: '/syncs/labels',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: The Gmail Labels API doesn't support incremental filtering.
        // The labels.list endpoint returns all labels without a modified_since
        // or updated_after parameter. Full refresh is required.
        await nango.trackDeletesStart('Label');

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/list
        const response = await nango.get({
            endpoint: '/gmail/v1/users/me/labels',
            retries: 3
        });

        const parsed = z
            .object({
                labels: z.array(ProviderLabelSchema).optional()
            })
            .safeParse(response.data);

        if (!parsed.success) {
            throw new Error(`Invalid response from Gmail API: ${parsed.error.message}`);
        }

        const labels = parsed.data.labels ?? [];

        const mappedLabels = labels.map((label) => ({
            id: label.id,
            name: label.name,
            ...(label.messageListVisibility && { messageListVisibility: label.messageListVisibility }),
            ...(label.labelListVisibility && { labelListVisibility: label.labelListVisibility }),
            ...(label.type && { type: label.type }),
            ...(label.messagesTotal !== undefined && { messagesTotal: label.messagesTotal }),
            ...(label.messagesUnread !== undefined && { messagesUnread: label.messagesUnread }),
            ...(label.threadsTotal !== undefined && { threadsTotal: label.threadsTotal }),
            ...(label.threadsUnread !== undefined && { threadsUnread: label.threadsUnread })
        }));

        if (mappedLabels.length > 0) {
            await nango.batchSave(mappedLabels, 'Label');
        }

        await nango.trackDeletesEnd('Label');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
