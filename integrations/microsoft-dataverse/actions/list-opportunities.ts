import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const DEFAULT_SELECT_FIELDS = [
    'opportunityid',
    'name',
    'estimatedvalue',
    'estimatedclosedate',
    'statecode',
    'statuscode',
    'closeprobability',
    'stepname',
    'description',
    'createdon',
    'modifiedon',
    '_customerid_value',
    '_ownerid_value'
];

const InputSchema = z
    .object({
        select: z
            .array(z.string())
            .optional()
            .describe('Opportunity attribute logical names to return, replacing the default field set. Example: ["name", "estimatedvalue"]'),
        filter: z
            .string()
            .optional()
            .describe('OData $filter expression over opportunity attribute logical names. Example: "statecode eq 0 and estimatedvalue gt 10000"'),
        orderby: z.string().optional().describe('OData $orderby expression. Example: "estimatedvalue desc"'),
        top: z.number().int().positive().optional().describe('Maximum number of opportunities to return. Example: 50'),
        cursor: z
            .string()
            .optional()
            .describe(
                'Opaque server paging token ($skiptoken) from the next_cursor of a previous response. Omit for the first page, and repeat the same select, filter and orderby values when following it.'
            )
    })
    .describe('List opportunities input.');

const OpportunitySchema = z
    .looseObject({
        opportunityid: z.string().optional().describe('Unique identifier (GUID) of the opportunity.'),
        name: z.string().nullable().optional().describe('Title of the opportunity.'),
        estimatedvalue: z.number().nullable().optional().describe('Estimated revenue in the opportunity transaction currency.'),
        estimatedclosedate: z.string().nullable().optional().describe('Estimated close date (YYYY-MM-DD).'),
        statecode: z.number().nullable().optional().describe('State code: 0 = Open, 1 = Won, 2 = Lost.'),
        statuscode: z.number().nullable().optional().describe('Status reason code paired with statecode.'),
        closeprobability: z.number().nullable().optional().describe('Close probability (0-100).'),
        stepname: z.string().nullable().optional().describe('Current pipeline stage name of the opportunity.'),
        description: z.string().nullable().optional().describe('Free-text description of the opportunity.'),
        createdon: z.string().nullable().optional().describe('Record creation timestamp (ISO 8601, UTC).'),
        modifiedon: z.string().nullable().optional().describe('Record last-modified timestamp (ISO 8601, UTC).'),
        _customerid_value: z.string().nullable().optional().describe('GUID of the related customer lookup (account or contact).'),
        _ownerid_value: z.string().nullable().optional().describe('GUID of the owning user or team lookup.')
    })
    .describe(
        'A Dataverse sales opportunity record. Attributes beyond the ones listed, including custom opportunity fields, depend on the select input and are passed through unchanged.'
    );

const OutputSchema = z
    .object({
        opportunities: z.array(OpportunitySchema).describe('Opportunities matching the query, in the requested order.'),
        next_cursor: z
            .string()
            .optional()
            .describe('Opaque server paging token for the next page. Present only when more records are available; pass it back as cursor to continue.')
    })
    .describe('List opportunities output.');

const ProviderResponseSchema = z.object({
    value: z.array(OpportunitySchema),
    '@odata.nextLink': z.string().optional()
});

function extractSkipToken(nextLink: string): string | undefined {
    if (!URL.canParse(nextLink)) {
        return undefined;
    }
    return new URL(nextLink).searchParams.get('$skiptoken') ?? undefined;
}

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET on the opportunities entity set and creates, updates, or deletes nothing in the provider.
 * @pitfalls: select, filter and orderby are raw OData v4 query options over opportunity attribute logical names (e.g. "statecode eq 0"); invalid syntax or unknown attribute names make the provider reject the request with a 400. Without top, results are capped at a single server-sized page (org default, normally 5000 records); pass the returned next_cursor back as cursor to continue.
 */
const action = createAction({
    description: 'List sales opportunities.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const selectFields = input.select !== undefined && input.select.length > 0 ? input.select : DEFAULT_SELECT_FIELDS;

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            endpoint: '/api/data/v9.2/opportunities',
            params: {
                $select: selectFields.join(','),
                ...(input.filter !== undefined && { $filter: input.filter }),
                ...(input.orderby !== undefined && { $orderby: input.orderby }),
                ...(input.top !== undefined && { $top: input.top }),
                ...(input.cursor !== undefined && { $skiptoken: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data);
        const nextCursor = parsed['@odata.nextLink'] !== undefined ? extractSkipToken(parsed['@odata.nextLink']) : undefined;

        return {
            opportunities: parsed.value,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
