import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Account notification ID. Example: 297967751')
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
    description: 'Get a single account notification by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `/api/v3/account_notifications/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Account notification not found',
                id: input.id
            });
        }

        const providerNotification = ProviderAccountNotificationSchema.parse(response.data);

        return {
            id: providerNotification.id,
            user_id: providerNotification.user_id,
            text: providerNotification.text,
            seen: providerNotification.seen,
            created_at: providerNotification.created_at,
            updated_at: providerNotification.updated_at,
            ...(providerNotification.account_id != null && { account_id: providerNotification.account_id }),
            ...(providerNotification.read_at != null && { read_at: providerNotification.read_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
