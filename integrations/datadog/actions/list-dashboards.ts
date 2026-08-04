import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum number of dashboards to return. Defaults to 100.')
});

const ProviderDashboardSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    author_handle: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    layout_type: z.string().optional(),
    url: z.string().optional(),
    is_read_only: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    dashboards: z.array(ProviderDashboardSchema)
});

const DashboardSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    author_handle: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    layout_type: z.string().optional(),
    url: z.string().optional(),
    is_read_only: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(DashboardSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List dashboards in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['dashboards_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const start = input.cursor ? parseInt(input.cursor, 10) : 0;

        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/dashboards/#get-all-dashboards
            endpoint: 'v1/dashboard',
            params: {
                ...(start > 0 && { start: start }),
                ...(input.limit !== undefined && { count: input.limit })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.dashboards.map((dashboard) => ({
            id: dashboard.id,
            title: dashboard.title,
            ...(dashboard.description != null && { description: dashboard.description }),
            ...(dashboard.author_handle !== undefined && { author_handle: dashboard.author_handle }),
            ...(dashboard.created_at !== undefined && { created_at: dashboard.created_at }),
            ...(dashboard.modified_at !== undefined && { modified_at: dashboard.modified_at }),
            ...(dashboard.layout_type !== undefined && { layout_type: dashboard.layout_type }),
            ...(dashboard.url !== undefined && { url: dashboard.url }),
            ...(dashboard.is_read_only !== undefined && { is_read_only: dashboard.is_read_only })
        }));

        const nextCursor = providerResponse.dashboards.length === limit ? String(start + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
