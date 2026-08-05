import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
});

const LeadSourceSchema = z.object({
    id: z.number(),
    name: z.string(),
    cost_per_lead_in_cents: z.number().nullable().optional(),
    flat_fee_in_cents: z.number().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const PaginationSchema = z.object({
    page: z.number(),
    pages: z.number().optional(),
    per_page: z.number(),
    total: z.number(),
    url: z.string().optional()
});

const ProviderListSchema = z.object({
    entries: z.array(LeadSourceSchema),
    pagination: PaginationSchema
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            cost_per_lead_in_cents: z.number().optional(),
            flat_fee_in_cents: z.number().optional(),
            created_at: z.string().optional(),
            updated_at: z.string().optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List lead sources (how a person/deal originated) configured on this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? Number(input.cursor) : 1;
        const response = await nango.get({
            // https://app.pipelinecrm.com/openapi.yaml
            endpoint: 'api/v3/admin/lead_sources',
            params: {
                page: String(page),
                per_page: '200'
            },
            retries: 3
        });

        const providerData = ProviderListSchema.parse(response.data);

        const items = providerData.entries.map((entry) => ({
            id: entry.id,
            name: entry.name,
            ...(entry.cost_per_lead_in_cents != null && { cost_per_lead_in_cents: entry.cost_per_lead_in_cents }),
            ...(entry.flat_fee_in_cents != null && { flat_fee_in_cents: entry.flat_fee_in_cents }),
            ...(entry.created_at != null && { created_at: entry.created_at }),
            ...(entry.updated_at != null && { updated_at: entry.updated_at })
        }));

        const hasMore =
            providerData.pagination.page < (providerData.pagination.pages ?? Math.ceil(providerData.pagination.total / providerData.pagination.per_page));

        return {
            items,
            ...(hasMore && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
