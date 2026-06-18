import { z } from 'zod';
import { createAction } from 'nango';

const ListViewsInputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ViewSchema = z.object({
    id: z.number(),
    title: z.string(),
    active: z.boolean().optional(),
    default: z.boolean().optional(),
    description: z.string().nullable().optional(),
    position: z.number().optional(),
    conditions: z.object({}).passthrough().optional(),
    execution: z.object({}).passthrough().optional(),
    restriction: z.union([z.object({}).passthrough(), z.null()]).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    views: z.array(ViewSchema),
    meta: z
        .object({
            has_more: z.boolean().optional(),
            after_cursor: z.string().optional(),
            before_cursor: z.string().optional()
        })
        .optional(),
    count: z.number().optional()
});

const ViewOutputSchema = z.object({
    id: z.number(),
    title: z.string(),
    active: z.boolean().optional(),
    default: z.boolean().optional(),
    description: z.string().optional(),
    position: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ListViewsOutputSchema = z.object({
    views: z.array(ViewOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List ticket views for the account',
    version: '1.0.1',
    input: ListViewsInputSchema,
    output: ListViewsOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListViewsOutputSchema>> => {
        // https://developer.zendesk.com/api-reference/ticketing/business-rules/views/#list-views
        const response = await nango.get({
            endpoint: '/api/v2/views.json',
            params: {
                ...(input.cursor && { 'page[after]': input.cursor }),
                'page[size]': 100
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            views: parsed.views.map((view) => ({
                id: view.id,
                title: view.title,
                ...(view.active !== undefined && { active: view.active }),
                ...(view.default !== undefined && { default: view.default }),
                ...(view.description != null && { description: view.description }),
                ...(view.position !== undefined && { position: view.position }),
                ...(view.created_at !== undefined && { created_at: view.created_at }),
                ...(view.updated_at !== undefined && { updated_at: view.updated_at })
            })),
            ...(parsed.meta?.after_cursor !== undefined && { next_cursor: parsed.meta.after_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
