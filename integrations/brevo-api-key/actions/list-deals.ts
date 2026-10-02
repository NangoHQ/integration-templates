import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().positive().optional().describe('Number of deals per page. Defaults to 50 on the provider side. Example: 10'),
        offset: z.number().int().nonnegative().optional().describe('Index of the first deal of the page. Omit or use 0 for the first page. Example: 0'),
        sort: z.enum(['asc', 'desc']).optional().describe("Sort direction for the results. Defaults to 'desc' (descending by creation date) when omitted."),
        sortBy: z
            .string()
            .optional()
            .describe(
                "Attribute path used to sort the results, e.g. 'attributes.created_at'. Bare field names like 'created_at' are rejected by the provider; applied together with sort."
            ),
        dealName: z.string().optional().describe('Filter by deal name.'),
        dealOwner: z.string().optional().describe('Filter by deal owner. Pass the account email address of the deal owner.'),
        dealStage: z.string().optional().describe('Filter by deal stage. Pass the stage ID retrievable from the pipeline details.'),
        pipeline: z.string().optional().describe('Filter by pipeline. Pass the pipeline ID retrievable from the pipeline details.'),
        linkedContactsIds: z.number().int().optional().describe('Filter by linked contact ID. Example: 1'),
        linkedCompaniesIds: z.string().optional().describe('Filter by linked company ID, a 24-character hex string.'),
        modifiedSince: z.string().optional().describe('Only return deals modified after this UTC date-time (YYYY-MM-DDTHH:mm:ss.SSSZ).'),
        createdSince: z.string().optional().describe('Only return deals created after this UTC date-time (YYYY-MM-DDTHH:mm:ss.SSSZ).')
    })
    .describe(
        'Filters, sorting, and pagination for listing deals. All fields are optional; with no input the first page of deals is returned, sorted by creation date descending.'
    );

const DealSchema = z
    .object({
        id: z.string().optional().describe('Unique deal ID, a 24-character hex string. Example: "629475917295261d9b1f4403"'),
        attributes: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Deal attributes with values, e.g. deal_name, amount, pipeline, deal_stage, deal_owner, created_at, last_updated_date.'),
        linkedContactsIds: z.array(z.number()).optional().describe('IDs of contacts linked to this deal.'),
        linkedCompaniesIds: z.array(z.string()).optional().describe('IDs of companies linked to this deal, as 24-character hex strings.'),
        createdBy: z.string().optional().describe('ID of the account user who created the deal.'),
        companyTimelineEnabledFrom: z
            .string()
            .nullable()
            .optional()
            .describe('UTC date-time from which the company timeline is enabled for this deal, or null when not enabled.'),
        refs: z.record(z.string(), z.unknown()).optional().describe('Referenced objects related to this deal, when present.')
    })
    .describe('A single deal.');

const PagerSchema = z
    .object({
        current: z.number().optional().describe('Current page number (1-based).'),
        limit: z.number().optional().describe('Page size used for this result set.'),
        from: z.number().optional().describe('Index of the first deal of this page (0-based).'),
        to: z.number().optional().describe('End index of the page window (from + limit).'),
        count: z.number().optional().describe('Number of deals in this page.'),
        total: z.number().optional().describe('Total number of deals matching the filters.'),
        max: z.number().optional().describe('Total number of pages available with the current page size.')
    })
    .describe('Pagination details for the result set.');

const OutputSchema = z
    .object({
        items: z.array(DealSchema).describe('List of deals for the requested page.'),
        pager: PagerSchema.optional().describe('Pagination details for the result set.'),
        refs: z.record(z.string(), z.unknown()).optional().describe('Referenced objects related to the returned deals, when present.')
    })
    .describe('Paginated list of deals.');

const ProviderResponseSchema = z.object({
    items: z.array(DealSchema).optional(),
    pager: PagerSchema.optional(),
    refs: z.record(z.string(), z.unknown()).optional()
});

/**
 * @tags: [read]
 * @tagReason: Only reads deals through a single GET request; it never creates, updates, or deletes anything on the provider.
 * @pitfalls: Deals are sorted by creation date descending by default. sortBy must be an attribute path such as 'attributes.created_at'; bare field names are rejected with a 400 error. The dealStage and pipeline filters require internal stage/pipeline IDs, and dealOwner expects the owner's account email address.
 */
const action = createAction({
    description: "List deals (Brevo's lightweight CRM deal/opportunity objects).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/get_crm-deals
        const response = await nango.get({
            endpoint: '/crm/deals',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.sortBy !== undefined && { sortBy: input.sortBy }),
                ...(input.dealName !== undefined && { 'filters[attributes.deal_name]': input.dealName }),
                ...(input.dealOwner !== undefined && { 'filters[attributes.deal_owner]': input.dealOwner }),
                ...(input.dealStage !== undefined && { 'filters[attributes.deal_stage]': input.dealStage }),
                ...(input.pipeline !== undefined && { 'filters[attributes.pipeline]': input.pipeline }),
                ...(input.linkedContactsIds !== undefined && { 'filters[linkedContactsIds]': input.linkedContactsIds }),
                ...(input.linkedCompaniesIds !== undefined && { 'filters[linkedCompaniesIds]': input.linkedCompaniesIds }),
                ...(input.modifiedSince !== undefined && { modifiedSince: input.modifiedSince }),
                ...(input.createdSince !== undefined && { createdSince: input.createdSince })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.items ?? [],
            ...(parsed.pager !== undefined && { pager: parsed.pager }),
            ...(parsed.refs !== undefined && { refs: parsed.refs })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
