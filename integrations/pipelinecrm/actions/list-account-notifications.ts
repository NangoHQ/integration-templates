import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const ProviderPaginationSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    pages: z.number(),
    total: z.number(),
    page_var: z.string().optional()
});

const ProviderAccountNotificationSchema = z.object({
    id: z.number().int(),
    user_id: z.number().int(),
    account_id: z.number().int().nullable(),
    text: z.string().nullable().optional(),
    seen: z.boolean().optional(),
    read_at: z.string().nullable().optional(),
    hide_popup: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    entries: z.array(z.unknown()),
    pagination: ProviderPaginationSchema
});

const AccountNotificationSchema = z.object({
    id: z.number().int(),
    user_id: z.number().int(),
    account_id: z.number().int().optional(),
    text: z.string().optional(),
    seen: z.boolean().optional(),
    read_at: z.string().optional(),
    hide_popup: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(AccountNotificationSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List system-generated account notifications for the authenticated user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'account_notifications.json',
            params: {
                ...(input.cursor && { page: input.cursor })
            },
            retries: 3,
            baseUrlOverride: 'https://api.pipelinecrm.com/api/v3'
        });

        const raw = ProviderListResponseSchema.parse(response.data);
        const entries = raw.entries.map((entry) => {
            const notification = ProviderAccountNotificationSchema.parse(entry);
            return {
                id: notification.id,
                user_id: notification.user_id,
                ...(notification.account_id != null && { account_id: notification.account_id }),
                ...(notification.text != null && { text: notification.text }),
                ...(notification.seen !== undefined && { seen: notification.seen }),
                ...(notification.read_at != null && { read_at: notification.read_at }),
                ...(notification.hide_popup !== undefined && { hide_popup: notification.hide_popup }),
                ...(notification.created_at !== undefined && { created_at: notification.created_at }),
                ...(notification.updated_at !== undefined && { updated_at: notification.updated_at })
            };
        });

        const hasMore = raw.pagination.page < raw.pagination.pages;

        return {
            items: entries,
            ...(hasMore && { next_cursor: String(raw.pagination.page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
