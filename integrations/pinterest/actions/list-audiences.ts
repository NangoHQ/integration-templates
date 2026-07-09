import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    cursor: z.string().optional().describe('Pagination cursor (bookmark) from the previous response. Omit for the first page.'),
    page_size: z.number().optional().describe('Maximum number of items to return per page.'),
    order: z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sorting order.'),
    ownership_type: z.enum(['OWNED', 'RECEIVED']).optional().describe('Filter by ownership type.'),
    exclude_nca: z.boolean().optional().describe('Exclude non-customer-acquisition audiences.')
});

const AudienceRuleSchema = z
    .object({
        ad_account_id: z.string().optional(),
        ad_id: z.array(z.string()).optional(),
        campaign_id: z.array(z.string()).optional(),
        country: z.string().optional(),
        customer_list_id: z.string().optional(),
        engagement_domain: z.array(z.string()).optional(),
        engagement_type: z.string().optional(),
        engager_type: z.number().optional(),
        event: z.string().optional(),
        event_data: z.unknown().optional(),
        event_source: z.record(z.string(), z.unknown()).optional(),
        ingestion_source: z.record(z.string(), z.unknown()).optional(),
        objective_type: z.array(z.string()).optional(),
        percentage: z.number().optional(),
        pin_id: z.array(z.string()).optional(),
        prefill: z.boolean().optional(),
        retention_days: z.number().optional(),
        seed_id: z.array(z.string()).optional(),
        url: z.array(z.string()).optional(),
        visitor_source_id: z.string().optional()
    })
    .passthrough();

const ProviderAudienceSchema = z
    .object({
        ad_account_id: z.string(),
        audience_type: z.string(),
        created_by_company_name: z.string().nullable().optional(),
        created_timestamp: z.number().nullable().optional(),
        description: z.string().nullable().optional(),
        id: z.string(),
        is_nca: z.boolean().optional(),
        name: z.string(),
        rule: AudienceRuleSchema.optional(),
        size: z.number().nullable().optional(),
        status: z.string(),
        type: z.string().optional(),
        updated_timestamp: z.number().nullable().optional()
    })
    .passthrough();

const ListResponseSchema = z.object({
    bookmark: z.string().nullable().optional(),
    items: z.array(z.unknown())
});

const AudienceOutputSchema = z
    .object({
        ad_account_id: z.string(),
        audience_type: z.string(),
        created_by_company_name: z.string().optional(),
        created_timestamp: z.number().optional(),
        description: z.string().optional(),
        id: z.string(),
        is_nca: z.boolean().optional(),
        name: z.string(),
        rule: AudienceRuleSchema.optional(),
        size: z.number().optional(),
        status: z.string(),
        type: z.string().optional(),
        updated_timestamp: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(AudienceOutputSchema),
    bookmark: z.string().optional()
});

const action = createAction({
    description: 'List audiences for an ad account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/audiences/list
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/audiences`,
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.ownership_type !== undefined && { ownership_type: input.ownership_type }),
                ...(input.exclude_nca !== undefined && { exclude_nca: String(input.exclude_nca) })
            },
            retries: 3
        });

        const listResponse = ListResponseSchema.parse(response.data);

        const items = listResponse.items.map((item) => {
            const parsed = ProviderAudienceSchema.parse(item);
            const normalized = {
                ...parsed,
                created_by_company_name: parsed.created_by_company_name ?? undefined,
                created_timestamp: parsed.created_timestamp ?? undefined,
                description: parsed.description ?? undefined,
                size: parsed.size ?? undefined,
                updated_timestamp: parsed.updated_timestamp ?? undefined
            };
            return AudienceOutputSchema.parse(normalized);
        });

        return {
            items,
            ...(listResponse.bookmark != null && { bookmark: listResponse.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
