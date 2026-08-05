import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page. Example: "2"'),
    query: z.string().optional().describe('Filter projects by id or name. Example: "My Project"')
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderMetaSchema = z.object({
    count: z.number(),
    page: z.number(),
    per_page: z.number()
});

const ProviderResponseSchema = z.object({
    projects: z.array(ProviderProjectSchema),
    meta: ProviderMetaSchema
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            created_at: z.string().optional(),
            updated_at: z.string().optional()
        })
    ),
    next_page: z.string().optional()
});

const action = createAction({
    description: 'List projects in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: '/v1/projects',
            params: {
                ...(input.cursor !== undefined && { page: input.cursor }),
                ...(input.query !== undefined && { query: input.query })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const { projects, meta } = providerResponse;

        const nextPage = meta.count > meta.page * meta.per_page ? String(meta.page + 1) : undefined;

        return {
            items: projects.map((project) => ({
                id: project.id,
                name: project.name,
                ...(project.created_at !== undefined && { created_at: project.created_at }),
                ...(project.updated_at !== undefined && { updated_at: project.updated_at })
            })),
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
