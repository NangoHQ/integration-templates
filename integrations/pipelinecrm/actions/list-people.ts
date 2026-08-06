import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().optional().describe('Number of results per page. Defaults to the provider maximum.')
});

const NestedCompanySchema = z
    .object({
        id: z.number(),
        name: z.string().optional().nullable()
    })
    .passthrough();

const NestedUserSchema = z
    .object({
        id: z.number(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable()
    })
    .passthrough();

const NestedLeadStatusSchema = z
    .object({
        id: z.number(),
        name: z.string().optional().nullable()
    })
    .passthrough();

const NestedLeadSourceSchema = z
    .object({
        id: z.number(),
        name: z.string().optional().nullable()
    })
    .passthrough();

const NestedCurrencySchema = z
    .object({
        code: z.string().optional().nullable(),
        symbol: z.string().optional().nullable(),
        name: z.string().optional().nullable()
    })
    .passthrough();

const PersonSchema = z
    .object({
        id: z.number(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        type: z.string().optional().nullable(),
        position: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        email2: z.string().optional().nullable(),
        home_email: z.string().optional().nullable(),
        mobile: z.string().optional().nullable(),
        home_phone: z.string().optional().nullable(),
        fax: z.string().optional().nullable(),
        website: z.string().optional().nullable(),
        instant_message: z.string().optional().nullable(),
        twitter: z.string().optional().nullable(),
        linked_in_url: z.string().optional().nullable(),
        facebook_url: z.string().optional().nullable(),
        summary: z.string().optional().nullable(),
        company_name: z.string().optional().nullable(),
        full_name: z.string().optional().nullable(),
        company_id: z.number().optional().nullable(),
        user_id: z.number().optional().nullable(),
        created_by_user_id: z.number().optional().nullable(),
        viewed_at: z.string().optional().nullable(),
        created_at: z.string().optional().nullable(),
        updated_at: z.string().optional().nullable(),
        unsubscribed: z.boolean().optional().nullable(),
        bounced: z.boolean().optional().nullable(),
        last_emailed_at: z.string().optional().nullable(),
        is_sample: z.boolean().optional().nullable(),
        is_key_contact: z.boolean().optional().nullable(),
        relationship: z.string().optional().nullable(),
        deal_ids: z.array(z.number()).optional().nullable(),
        shared_user_ids: z.array(z.number()).optional().nullable(),
        project_shared_user_ids: z.array(z.number()).optional().nullable(),
        image_thumb_url: z.string().optional().nullable(),
        image_mobile_url: z.string().optional().nullable(),
        company: NestedCompanySchema.optional().nullable(),
        user: NestedUserSchema.optional().nullable(),
        created_by_user: NestedUserSchema.optional().nullable(),
        lead_status: NestedLeadStatusSchema.optional().nullable(),
        lead_source: NestedLeadSourceSchema.optional().nullable(),
        currency: NestedCurrencySchema.optional().nullable(),
        deals: z
            .array(z.object({ id: z.number(), name: z.string().optional().nullable() }).passthrough())
            .optional()
            .nullable(),
        custom_fields: z.record(z.string(), z.unknown()).optional().nullable(),
        predefined_contacts_tag_ids: z.array(z.number()).optional().nullable(),
        predefined_contacts_tags: z.array(z.unknown()).optional().nullable()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    entries: z.array(PersonSchema),
    pagination: z.object({
        page: z.number(),
        pages: z.number(),
        per_page: z.number().optional(),
        total: z.number().optional()
    })
});

const OutputSchema = z.object({
    items: z.array(PersonSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List people (contacts/leads) in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        // https://app.pipelinecrm.com/openapi.yaml
        const response = await nango.get({
            endpoint: 'api/v3/people',
            params: {
                page: page,
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        const raw = ProviderResponseSchema.parse(response.data);

        const nextPage = raw.pagination.page + 1;
        const nextCursor = nextPage <= raw.pagination.pages ? String(nextPage) : undefined;

        return {
            items: raw.entries,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
