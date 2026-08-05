import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const NoteCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    editable: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const NoteCategoryListSchema = z.object({
    entries: z.array(NoteCategorySchema),
    pagination: z
        .object({
            page: z.number().optional(),
            page_var: z.string().optional(),
            per_page: z.number().optional(),
            pages: z.number().optional(),
            total: z.number().optional()
        })
        .optional()
});

const InputSchema = z.object({});

const OutputSchema = z.object({
    categories: z.array(NoteCategorySchema)
});

const action = createAction({
    description: 'List categories that can be assigned to a note (activity).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/note_categories',
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = NoteCategoryListSchema.parse(response.data);

        return {
            categories: parsed.entries
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
