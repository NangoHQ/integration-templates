import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().int().positive().optional(),
    page_size: z.number().int().min(1).max(200).optional(),
    search: z.string().optional(),
    workspace_id: z.string().optional(),
    sort_by: z.enum(['created_at', 'last_updated_at']).optional(),
    order_by: z.enum(['asc', 'desc']).optional(),
    is_public: z.boolean().optional()
});

const FormSummarySchema = z
    .object({
        id: z.string(),
        title: z.string().optional(),
        type: z.string().optional(),
        created_at: z.string().optional(),
        last_updated_at: z.string().optional(),
        settings: z
            .object({
                is_public: z.boolean().optional(),
                is_trial: z.boolean().optional()
            })
            .optional(),
        theme: z
            .object({
                href: z.string().optional()
            })
            .optional(),
        workspace: z
            .object({
                href: z.string().optional(),
                name: z.string().optional()
            })
            .optional(),
        self: z
            .object({
                href: z.string().optional()
            })
            .optional(),
        _links: z
            .object({
                display: z.string().optional(),
                responses: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    total_items: z.number(),
    page_count: z.number(),
    items: z.array(FormSummarySchema)
});

const action = createAction({
    description: 'List forms.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['forms:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.typeform.com/developers/create/reference/retrieve-forms/
            endpoint: '/forms',
            params: {
                ...(input.page !== undefined && { page: input.page }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.search !== undefined && { search: input.search }),
                ...(input.workspace_id !== undefined && { workspace_id: input.workspace_id }),
                ...(input.sort_by !== undefined && { sort_by: input.sort_by }),
                ...(input.order_by !== undefined && { order_by: input.order_by }),
                ...(input.is_public !== undefined && { is_public: input.is_public ? 'true' : 'false' })
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
