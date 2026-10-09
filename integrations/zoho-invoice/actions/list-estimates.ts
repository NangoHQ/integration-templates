import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .describe('Zoho Invoice organization ID. Required: every estimates endpoint needs it, and this connection cannot look it up. Example: "927270289"'),
        customer_id: z.string().optional().describe('Only return estimates for this customer/contact ID. Example: "260815000000097001"'),
        status: z
            .enum(['draft', 'sent', 'accepted', 'declined', 'invoiced', 'expired'])
            .optional()
            .describe('Only return estimates with this status. One of: draft, sent, accepted, declined, invoiced, expired.'),
        last_modified_time: z
            .string()
            .optional()
            .describe('Only return estimates modified at or after this ISO-8601 timestamp. Example: "2026-10-01T00:00:00+0000"'),
        page: z.number().int().positive().optional().describe('Page number to fetch, starting at 1. Defaults to 1.'),
        per_page: z.number().int().positive().max(200).optional().describe('Number of estimates per page (1-200). Defaults to 200.')
    })
    .describe('Filters for listing estimates (quotes) from Zoho Invoice.');

const ProviderEstimateSchema = z.object({
    estimate_id: z.union([z.string(), z.number()]),
    estimate_number: z.string().nullish(),
    customer_id: z.union([z.string(), z.number()]).nullish(),
    customer_name: z.string().nullish(),
    status: z.string().nullish(),
    reference_number: z.string().nullish(),
    date: z.string().nullish(),
    expiry_date: z.string().nullish(),
    currency_id: z.union([z.string(), z.number()]).nullish(),
    currency_code: z.string().nullish(),
    total: z.number().nullish(),
    created_time: z.string().nullish(),
    last_modified_time: z.string().nullish(),
    accepted_date: z.string().nullish(),
    declined_date: z.string().nullish(),
    has_attachment: z.boolean().nullish(),
    is_viewed_by_client: z.boolean().nullish(),
    client_viewed_time: z.string().nullish()
});

const ProviderPageContextSchema = z.object({
    page: z.number().nullish(),
    per_page: z.number().nullish(),
    has_more_page: z.boolean().nullish()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    estimates: z.array(ProviderEstimateSchema),
    page_context: ProviderPageContextSchema.nullish()
});

const EstimateSchema = z.object({
    estimate_id: z.string().describe('Unique estimate ID. Example: "982000000567011"'),
    estimate_number: z.string().optional().describe('Estimate serial number. Example: "EST-00002"'),
    customer_id: z.string().optional().describe('ID of the customer the estimate belongs to.'),
    customer_name: z.string().optional().describe('Name of the customer the estimate belongs to.'),
    status: z.string().optional().describe('Estimate status: draft, sent, accepted, declined, invoiced, or expired.'),
    reference_number: z.string().optional().describe('Transaction reference number.'),
    date: z.string().optional().describe('Estimate date (YYYY-MM-DD).'),
    expiry_date: z.string().optional().describe('Estimate expiry date (YYYY-MM-DD).'),
    currency_id: z.string().optional().describe('ID of the currency used on the estimate.'),
    currency_code: z.string().optional().describe('Currency code, e.g. "USD".'),
    total: z.number().optional().describe('Total amount of the estimate.'),
    created_time: z.string().optional().describe('Timestamp when the estimate was created.'),
    last_modified_time: z.string().optional().describe('Timestamp when the estimate was last modified.'),
    accepted_date: z.string().optional().describe('Date the estimate was accepted, if any.'),
    declined_date: z.string().optional().describe('Date the estimate was declined, if any.'),
    has_attachment: z.boolean().optional().describe('Whether the estimate has an attachment.'),
    is_viewed_by_client: z.boolean().optional().describe('Whether the client has viewed the estimate.'),
    client_viewed_time: z.string().optional().describe('Timestamp when the client viewed the estimate, if any.')
});

const PageContextSchema = z.object({
    page: z.number().describe('Current page number.'),
    per_page: z.number().describe('Number of records returned per page.'),
    has_more_page: z.boolean().describe('Whether another page of results is available.')
});

const OutputSchema = z
    .object({
        estimates: z.array(EstimateSchema).describe('Estimates matching the supplied filters.'),
        page_context: PageContextSchema.describe('Pagination metadata for the returned page.')
    })
    .describe('Estimates matching the supplied filters, with pagination metadata for the returned page.');

/**
 * @tags: [read]
 * @tagReason: Lists estimates from Zoho Invoice; no provider state is created, updated, or deleted.
 * @pitfalls: organization_id is required: omitting it returns Zoho error 9017, and this connection cannot look it up because it lacks the settings scope; last_modified_time only accepts Zoho's ISO-8601 form such as "2026-10-01T00:00:00+0000"; results are paged (per_page defaults to 200), so use page/per_page and page_context.has_more_page to fetch all matches.
 */
const action = createAction({
    description: 'List estimates (quotes) with optional customer/status and incremental last_modified_time filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.estimates.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/invoice/api/v3/estimates/#list-estimates
            endpoint: '/invoice/v3/estimates',
            params: {
                organization_id: input.organization_id,
                ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.last_modified_time !== undefined && { last_modified_time: input.last_modified_time }),
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const estimates = providerResponse.estimates.map((estimate) => ({
            estimate_id: String(estimate.estimate_id),
            ...(estimate.estimate_number != null && { estimate_number: estimate.estimate_number }),
            ...(estimate.customer_id != null && { customer_id: String(estimate.customer_id) }),
            ...(estimate.customer_name != null && { customer_name: estimate.customer_name }),
            ...(estimate.status != null && { status: estimate.status }),
            ...(estimate.reference_number != null && { reference_number: estimate.reference_number }),
            ...(estimate.date != null && { date: estimate.date }),
            ...(estimate.expiry_date != null && { expiry_date: estimate.expiry_date }),
            ...(estimate.currency_id != null && { currency_id: String(estimate.currency_id) }),
            ...(estimate.currency_code != null && { currency_code: estimate.currency_code }),
            ...(estimate.total != null && { total: estimate.total }),
            ...(estimate.created_time != null && { created_time: estimate.created_time }),
            ...(estimate.last_modified_time != null && { last_modified_time: estimate.last_modified_time }),
            ...(estimate.accepted_date != null && { accepted_date: estimate.accepted_date }),
            ...(estimate.declined_date != null && { declined_date: estimate.declined_date }),
            ...(estimate.has_attachment != null && { has_attachment: estimate.has_attachment }),
            ...(estimate.is_viewed_by_client != null && { is_viewed_by_client: estimate.is_viewed_by_client }),
            ...(estimate.client_viewed_time != null && { client_viewed_time: estimate.client_viewed_time })
        }));

        const pageContext = providerResponse.page_context;

        return {
            estimates,
            page_context: {
                page: pageContext?.page ?? 1,
                per_page: pageContext?.per_page ?? estimates.length,
                has_more_page: pageContext?.has_more_page ?? false
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
