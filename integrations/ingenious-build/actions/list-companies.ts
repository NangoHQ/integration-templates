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
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List companies (vendors, subcontractors, clients, etc) in this workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let page = 1;
        let perPage = input.per_page ?? 20;

        // The page size is encoded in the cursor (rather than relying solely on the page number)
        // so that a caller supplying a different per_page on a follow-up call can't desync the
        // scan and skip or repeat companies.
        if (input.cursor !== undefined) {
            const match = /^(\d+):(\d+)$/.exec(input.cursor);
            const pageStr = match?.[1];
            const perPageStr = match?.[2];
            if (pageStr === undefined || perPageStr === undefined) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
            page = parseInt(pageStr, 10);
            perPage = parseInt(perPageStr, 10);
            if (page < 1) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
        }

        const response = await nango.get({
            // https://api.ingenious.build/reference/indexcompanypubv2
            endpoint: '/api/v2/pub/companies',
            params: {
                page: String(page),
                per_page: String(perPage),
                ...(input.show_archived !== undefined && { show_archived: input.show_archived })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const nextCursor = providerResponse.next_page_url != null ? `${page + 1}:${perPage}` : undefined;

        return {
            items: providerResponse.items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
