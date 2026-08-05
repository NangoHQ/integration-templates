import { z } from 'zod';
import { createAction } from 'nango';

const ProductLineSchema = z.object({
    id: z.number(),
    name: z.string(),
    enabled_for_deals: z.boolean().optional(),
    enabled_for_people: z.boolean().optional(),
    enabled_for_companies: z.boolean().optional()
});

const PaginationSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    total: z.number()
});

const ProviderListSchema = z.object({
    entries: z.array(ProductLineSchema),
    pagination: PaginationSchema.optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const OutputSchema = z.object({
    items: z.array(ProductLineSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List product lines configured on this account for tagging deals, people, and companies.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer representing a page number'
            });
        }

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/admin/product_lines',
            params: {
                page: String(page)
            },
            retries: 3
        });

        const providerData = ProviderListSchema.parse(response.data);

        let nextPage: string | undefined;
        if (providerData.pagination) {
            nextPage =
                providerData.pagination.page * providerData.pagination.per_page < providerData.pagination.total
                    ? String(providerData.pagination.page + 1)
                    : undefined;
        }

        return {
            items: providerData.entries,
            ...(nextPage !== undefined && { next_cursor: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
