import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page. Example: "2"'),
    per_page: z.number().min(1).max(100).optional().describe('Number of items per page. Maximum 100.'),
    show_archived: z.enum(['true', 'false']).optional().describe('Include archived companies.')
});

const TagSchema = z.object({
    id: z.string(),
    name: z.string()
});

const CompanySchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    account_type: z.string().nullable().optional(),
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    country_code: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    custom_id: z.string().nullable().optional(),
    office_locations: z.array(z.string()).optional(),
    is_archived: z.boolean().nullable().optional(),
    tags: z.array(TagSchema).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(CompanySchema),
    total: z.number(),
    page: z.number(),
    per_page: z.number(),
    next_page_url: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(CompanySchema),
    next_page: z.string().optional()
});

const action = createAction({
    description: 'List companies (vendors, subcontractors, clients, etc) in this workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? Number(input.cursor) : 1;

        const response = await nango.get({
            // https://api.ingenious.build/reference/indexcompanypubv2
            endpoint: '/api/v2/pub/companies',
            params: {
                page: String(page),
                per_page: String(input.per_page ?? 20),
                ...(input.show_archived !== undefined && { show_archived: input.show_archived })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const nextPage = providerResponse.next_page_url != null ? String(page + 1) : undefined;

        return {
            items: providerResponse.items,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
