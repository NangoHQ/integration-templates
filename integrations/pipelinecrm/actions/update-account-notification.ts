import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Account notification ID. Example: 297967751'),
    seen: z.boolean().optional().describe('Mark notification as seen. Defaults to true if omitted.')
});

const ProviderAccountNotificationSchema = z.object({
    id: z.number(),
    account_id: z.number().nullable(),
    user_id: z.number(),
    text: z.string(),
    read_at: z.string().nullable(),
    seen: z.boolean(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    account_id: z.number().optional(),
    user_id: z.number(),
    text: z.string(),
    read_at: z.string().optional(),
    seen: z.boolean(),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Mark an account notification as seen/read.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const seen = input.seen !== false;

        const response = await nango.put({
            // https://app.pipelinecrm.com/api/docs/introduction
            // Pipeline silently ignores this update unless read_at is sent alongside seen.
            endpoint: `/api/v3/account_notifications/${encodeURIComponent(String(input.id))}`,
            data: {
                account_notification: {
                    seen: seen,
                    read_at: seen ? new Date().toISOString() : null
                }
            },
            retries: 1
        });

        const providerNotification = ProviderAccountNotificationSchema.parse(response.data);

        return {
            id: providerNotification.id,
            ...(providerNotification.account_id != null && { account_id: providerNotification.account_id }),
            user_id: providerNotification.user_id,
            text: providerNotification.text,
            ...(providerNotification.read_at != null && { read_at: providerNotification.read_at }),
            seen: providerNotification.seen,
            created_at: providerNotification.created_at,
            updated_at: providerNotification.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
