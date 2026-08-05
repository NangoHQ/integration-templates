import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination page number from the previous response. Omit for the first page.'),
    query: z.string().optional().describe('Filter domains by id or domain name.')
});

const DomainSchema = z
    .object({
        id: z.number().describe('Domain ID. Example: 123')
    })
    .passthrough();

const MetaSchema = z.object({
    count: z.number(),
    page: z.number(),
    per_page: z.number()
});

const ListResponseSchema = z.object({
    domains: z.array(DomainSchema),
    meta: MetaSchema
});

const OutputSchema = z.object({
    items: z.array(DomainSchema),
    next_page: z.string().optional()
});

const action = createAction({
    description: 'List custom domains configured on this account for branded form/redirect URLs.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: 'v1/domains',
            params: {
                ...(input.cursor !== undefined && { page: input.cursor }),
                ...(input.query !== undefined && { query: input.query })
            },
            retries: 3
        });

        const parsed = ListResponseSchema.parse(response.data);
        const hasMore = parsed.meta.count > parsed.meta.page * parsed.meta.per_page;
        const nextPage = hasMore ? String(parsed.meta.page + 1) : undefined;

        return {
            items: parsed.domains,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
