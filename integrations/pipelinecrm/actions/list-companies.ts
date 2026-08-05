import { z } from 'zod';
import { createAction } from 'nango';

const CurrencySchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        code: z.string().optional(),
        symbol: z.string().optional(),
        decimal_places: z.number().optional()
    })
    .passthrough();

const CustomerSchema = z
    .object({
        id: z.number(),
        owner_id: z.number().optional().nullable(),
        health_score: z.number().optional().nullable(),
        company_id: z.number().optional(),
        created_at: z.string().optional().nullable(),
        updated_at: z.string().optional().nullable(),
        latest_health_score_activity_id: z.number().optional().nullable(),
        health_score_description: z.string().optional().nullable(),
        next_milestone_id: z.number().optional().nullable(),
        health_score_changed_at: z.string().optional().nullable(),
        account_id: z.number().optional()
    })
    .passthrough();

const TagSchema = z
    .object({
        id: z.number(),
        name: z.string().optional()
    })
    .passthrough();

const OwnerSchema = z
    .object({
        id: z.number(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        full_name: z.string().optional().nullable()
    })
    .passthrough();

const CompanySchema = z
    .object({
        id: z.number(),
        name: z.string().optional().nullable(),
        address_1: z.string().optional().nullable(),
        address_2: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        postal_code: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        fax: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        web: z.string().optional().nullable(),
        phone1: z.string().optional().nullable(),
        phone1_desc: z.string().optional().nullable(),
        phone2: z.string().optional().nullable(),
        phone2_desc: z.string().optional().nullable(),
        phone3: z.string().optional().nullable(),
        phone3_desc: z.string().optional().nullable(),
        phone4: z.string().optional().nullable(),
        phone4_desc: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        instant_message: z.string().optional().nullable(),
        twitter: z.string().optional().nullable(),
        linked_in_url: z.string().optional().nullable(),
        facebook_url: z.string().optional().nullable(),
        created_at: z.string().optional().nullable(),
        updated_at: z.string().optional().nullable(),
        import_id: z.number().optional().nullable(),
        owner_id: z.number().optional().nullable(),
        is_sample: z.boolean().optional(),
        is_customer: z.boolean().optional(),
        owner: OwnerSchema.optional().nullable(),
        custom_fields: z.object({}).passthrough().optional().nullable(),
        tag_ids: z.array(z.number()).optional().nullable(),
        tags: z.array(TagSchema).optional().nullable(),
        currency: CurrencySchema.optional().nullable(),
        customer: CustomerSchema.optional().nullable()
    })
    .passthrough();

const PaginationSchema = z
    .object({
        page: z.number(),
        per_page: z.number(),
        pages: z.number(),
        total: z.number()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    entries: z.array(CompanySchema),
    pagination: PaginationSchema
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().optional().describe('Number of items per page. Example: 20')
});

const OutputSchema = z.object({
    companies: z.array(CompanySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List companies in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }
        const perPage = input.per_page ?? 20;

        // https://app.pipelinecrm.com/openapi.yaml
        const response = await nango.get({
            endpoint: 'api/v3/companies',
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const hasNextPage = providerResponse.pagination.page < providerResponse.pagination.pages;
        const nextCursor = hasNextPage ? String(page + 1) : undefined;

        return {
            companies: providerResponse.entries,
            next_cursor: nextCursor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
