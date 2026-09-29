import { z } from 'zod';
import { createAction } from 'nango';

const RecordSchema = z.record(z.string(), z.unknown());

const InputSchema = z
    .object({
        entitySetName: z
            .string()
            .describe(
                "Entity set name (plural collection name) of the Dataverse entity to query, e.g. 'accounts', 'contacts', 'opportunities', or a custom entity set. Use the list-entity-definitions action to discover available entity set names. Example: 'accounts'"
            ),
        fetchXml: z
            .string()
            .describe(
                'Raw FetchXML query document to execute against the entity set. The <entity name="..."> element inside the FetchXML must use the entity\'s logical (singular) name, e.g. "account" for the "accounts" entity set. Example: <fetch top="3"><entity name="account"><attribute name="name"/><attribute name="accountid"/><order attribute="name" descending="false"/></entity></fetch>'
            )
    })
    .describe('Parameters for running a raw FetchXML query against any Dataverse entity set: the target entity set and the FetchXML document itself.');

const OutputSchema = z
    .object({
        records: z
            .array(RecordSchema)
            .describe(
                'Rows returned by the FetchXML query. Each row is an object keyed by the requested attribute or alias names; aggregate queries expose their aliased aggregate columns instead of the original attribute names.'
            )
    })
    .describe('Result of the FetchXML query executed against the target Dataverse entity set.');

const ProviderResponseSchema = z.object({
    value: z.array(RecordSchema)
});

/**
 * @tags: [read]
 * @tagReason: Executes a read-only FetchXML query against Dataverse records; performs no provider mutations.
 * @pitfalls: Rows can include extra provider metadata properties such as @odata.etag beyond the requested attributes. Result sets larger than the server's page size are truncated to the first page and the output exposes no continuation indicator, so cap large queries with the FetchXML top attribute or page them with the FetchXML page/paging-cookie attributes. The <entity name="..."> inside the FetchXML must be the entity's logical (singular) name, not the plural entitySetName, e.g. 'account' versus 'accounts'.
 */
const action = createAction({
    description: 'Query any Dataverse entity using a raw FetchXML query, for aggregations and joins beyond simple OData $filter.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/use-fetchxml-web-api
            endpoint: `/api/data/v9.2/${encodeURIComponent(input.entitySetName)}`,
            params: {
                fetchXml: input.fetchXml
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return { records: parsed.value };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
