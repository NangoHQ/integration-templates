import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        entitySetName: z
            .string()
            .min(1)
            .describe(
                'Entity set name of the Dataverse entity to list, e.g. "accounts", "contacts" or a custom entity set. Use the list-entity-definitions action to discover every entity set available in the org.'
            ),
        $select: z
            .string()
            .optional()
            .describe(
                'Comma-separated list of attribute logical names to return (OData $select), e.g. "name,accountnumber,telephone1". Omit to return the entity\'s default attribute set.'
            ),
        $filter: z
            .string()
            .optional()
            .describe('OData $filter expression applied server-side, e.g. "name eq \'Contoso\'" or "modifiedon gt 2026-01-01T00:00:00Z".'),
        $orderby: z.string().optional().describe('OData $orderby expression, e.g. "name asc" or "modifiedon desc".'),
        $top: z
            .number()
            .int()
            .positive()
            .optional()
            .describe(
                'Maximum number of records to return (OData $top). Dataverse applies its own server-side page size regardless, so set this to cap results explicitly. Example: 50'
            ),
        $expand: z
            .string()
            .optional()
            .describe(
                'OData $expand expression that embeds related records inline via a navigation property, e.g. "parentcustomerid_account" on contacts. Expanded records appear as nested objects.'
            )
    })
    .describe('Query parameters for listing records of any Dataverse entity. Only entitySetName is required; the rest map to standard OData query options.');

const RecordSchema = z
    .record(z.string(), z.unknown())
    .describe(
        'A single Dataverse record keyed by attribute logical names. Values may be primitives, null, or nested objects for expanded navigation properties.'
    );

const ListResponseSchema = z.object({
    value: z.array(RecordSchema),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z
    .object({
        records: z
            .array(RecordSchema)
            .describe(
                'Matching records. Each record is keyed by Dataverse attribute logical names (e.g. "accountid", "name"); expanded navigation properties appear as nested objects.'
            ),
        nextLink: z
            .string()
            .optional()
            .describe('Absolute URL of the next page. Present only when Dataverse truncated the result at its server-side page size and more records exist.')
    })
    .describe('One page of Dataverse records plus the server-provided link to the next page when the result was truncated.');

/**
 * @tags: [read]
 * @tagReason: Issues a single GET request to read records; performs no provider-side mutation.
 * @pitfalls: Results are silently truncated at Dataverse's server-side page size (about 5000 rows) even when $top requests more, and further pages are only signaled by the nextLink output, which callers must follow themselves; fields with no value come back as explicit nulls rather than being omitted; an unrecognized entitySetName fails with a provider 404 error.
 */
const action = createAction({
    description: 'List records of any Dataverse entity (standard or custom) with OData query support',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            endpoint: `/api/data/v9.2/${encodeURIComponent(input.entitySetName)}`,
            params: {
                ...(input.$select !== undefined && { $select: input.$select }),
                ...(input.$filter !== undefined && { $filter: input.$filter }),
                ...(input.$orderby !== undefined && { $orderby: input.$orderby }),
                ...(input.$top !== undefined && { $top: input.$top }),
                ...(input.$expand !== undefined && { $expand: input.$expand })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ListResponseSchema.parse(response.data);

        return {
            records: parsed.value,
            ...(parsed['@odata.nextLink'] !== undefined && { nextLink: parsed['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
