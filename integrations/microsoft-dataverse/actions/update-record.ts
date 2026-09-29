import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        entitySetName: z
            .string()
            .describe(
                'Entity set name (plural) of the table the record belongs to, e.g. "accounts", "contacts", "leads". Use list-entity-definitions to discover the entity set names available in the org, including custom tables.'
            ),
        id: z.string().describe('ID (GUID) of the record to update, e.g. "5f21e9e4-e3b4-ef11-a316-000d3a0b1a2c".'),
        data: z
            .record(z.string(), z.unknown())
            .describe(
                'JSON object of the fields to change, keyed by logical attribute name, e.g. {"name": "Contoso", "telephone1": "555-0100"}. Only the fields sent are changed (partial merge). Setting a simple field to null clears it. Lookup fields must be set with a "<lookupLogicalName>@odata.bind": "/<entitySetName>(<guid>)" property.'
            )
    })
    .describe('Input for updating fields on an existing record of any Dataverse entity.');

const OutputSchema = z
    .object({
        id: z.string().describe('ID (GUID) of the updated record, echoed from the input.')
    })
    .describe(
        'Confirmation of the update. The Dataverse PATCH response itself is 204 No Content with no body; call get-record to read back the updated record.'
    );

/**
 * @tags: [write, destructive]
 * @tagReason: Partial-merge update that overwrites the previous values of the sent fields on an existing Dataverse record; setting a field to null clears it, and overwritten or cleared values cannot be recovered through the API.
 * @pitfalls: Lookup/relationship fields are not set by plain values or cleared by plain null in the update body; set a lookup with a "<lookupLogicalName>@odata.bind" property and use associate-records/disassociate-records to link or unlink records.
 */
const action = createAction({
    description: 'Update (partial merge) fields on an existing record of any Dataverse entity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api
        await nango.patch({
            endpoint: `/api/data/v9.2/${encodeURIComponent(input.entitySetName)}(${encodeURIComponent(input.id)})`,
            data: input.data,
            // No idempotency key exists; this targets an arbitrary entity, and a PATCH on it can trigger server-side plugins or workflows.
            // A retry after a lost response would re-fire those side effects, so retries must stay 0.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return { id: input.id };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
