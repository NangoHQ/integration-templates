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
                'Maximum number of records to return (OData $top). Example: 50. This is a hard cap in Dataverse: when set, results are truncated at this count and no nextLink is returned for the remaining matches. Omit to let Dataverse apply its own server-side page size and receive a nextLink when more records exist. Ignored when cursor is provided.'
            ),
        $expand: z
            .string()
            .optional()
            .describe(
                'OData $expand expression that embeds related records inline via a navigation property, e.g. "parentcustomerid_account" on contacts. Expanded records appear as nested objects.'
            ),
        cursor: z
            .string()
            .optional()
            .describe(
                'Opaque pagination cursor: pass the nextLink value returned by a previous response unchanged to fetch the next page. Omit for the first page. When set, $select/$filter/$orderby/$top/$expand are ignored because the cursor already encodes the original query; entitySetName must still be the same entity set the cursor was issued for.'
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

// Keep the serialized response safely under Nango's 2 MB action output limit: entitySetName,
// $select and $expand are all caller-controlled, so a wide custom entity or an $expand can be large.
const MAX_OUTPUT_BYTES = 1_900_000;

/**
 * @tags: [read]
 * @tagReason: Issues a single GET request to read records; performs no provider-side mutation.
 * @pitfalls: Results are silently truncated at Dataverse's server-side page size (about 5000 rows) even when $top requests more, and further pages are only signaled by the nextLink output; pass it back as cursor to fetch the next page. $top is a hard cap: when set, Dataverse does not emit a nextLink beyond it. Fields with no value come back as explicit nulls rather than being omitted; an unrecognized entitySetName fails with a provider 404 error. This action rejects a response that would exceed a safe size.
 */
const action = createAction({
    description: 'List records of any Dataverse entity (standard or custom) with OData query support',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const entityEndpoint = `/api/data/v9.2/${encodeURIComponent(input.entitySetName)}`;
        let endpoint = entityEndpoint;
        let params: Record<string, string | number>;

        if (input.cursor !== undefined) {
            let cursorUrl: URL;
            // @allowTryCatch: an unparsable cursor must surface as a caller-facing ActionError instead of an uncaught TypeError from the URL constructor.
            try {
                cursorUrl = new URL(input.cursor);
            } catch {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a valid nextLink value returned by a previous list-records call.'
                });
            }
            // Restricted to the same entity set named in entitySetName so a caller cannot redirect
            // this action into returning a different entity's records by passing a mismatched cursor.
            if (cursorUrl.pathname !== entityEndpoint) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor does not point at the entity set named in entitySetName.'
                });
            }
            endpoint = cursorUrl.pathname;
            // $skiptoken must be replayed together with the original $select/$filter/$orderby/$expand,
            // so the full next-link query string is preserved and reissued verbatim.
            params = Object.fromEntries(cursorUrl.searchParams.entries());
        } else {
            params = {
                ...(input.$select !== undefined && { $select: input.$select }),
                ...(input.$filter !== undefined && { $filter: input.$filter }),
                ...(input.$orderby !== undefined && { $orderby: input.$orderby }),
                // $top is only forwarded when explicitly requested: Dataverse treats it as a hard cap
                // on the whole result set and never emits a nextLink for a $top-capped request, so a
                // default $top here would silently disable pagination.
                ...(input.$top !== undefined && { $top: input.$top }),
                ...(input.$expand !== undefined && { $expand: input.$expand })
            };
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            endpoint,
            params,
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ListResponseSchema.parse(response.data);

        const output: z.infer<typeof OutputSchema> = {
            records: parsed.value,
            ...(parsed['@odata.nextLink'] !== undefined && { nextLink: parsed['@odata.nextLink'] })
        };

        const outputSize = new TextEncoder().encode(JSON.stringify(output)).length;
        if (outputSize > MAX_OUTPUT_BYTES) {
            throw new nango.ActionError({
                type: 'response_too_large',
                message: `The response (~${Math.round(outputSize / 1024)} KB) is too large to return safely. Narrow the request with a smaller $top, a more restrictive $select, or a $filter, and try again.`
            });
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
