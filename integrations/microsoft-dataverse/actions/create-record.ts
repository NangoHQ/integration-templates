import { z } from 'zod';
import { createAction } from 'nango';

const FieldValueSchema = z
    .unknown()
    .describe(
        'Value to set for the field. Strings, numbers, booleans, and null are sent as-is; objects and arrays are allowed for complex values such as activity parties.'
    );

const InputSchema = z
    .object({
        entitySetName: z
            .string()
            .min(1)
            .describe(
                'Entity set (plural) name of the entity to create, e.g. "accounts", "contacts", "leads". Works with any standard or custom entity in the org; use list-entity-definitions to discover available names. Example: "accounts"'
            ),
        fields: z
            .record(z.string(), FieldValueSchema)
            .describe(
                'Map of Dataverse field logical names to values for the new record, e.g. { "name": "Contoso Ltd", "telephone1": "555-0100" }. Field logical names are org-specific and custom fields carry a publisher prefix such as "new_fieldname"; use list-entity-attributes to discover them. To set a lookup field, use deep-insert bind syntax as the key, e.g. "parentcustomerid_account@odata.bind": "/accounts(<account-guid>)".'
            )
    })
    .describe('Input for creating a record of any Dataverse entity');

const OutputSchema = z
    .object({
        id: z
            .string()
            .describe('GUID of the newly created record, parsed from the OData-EntityId response header. Example: "1d9d6c4e-6f2a-4b3c-8d5e-7f8a9b0c1d2e"')
    })
    .describe('Result of creating the record');

/**
 * @tags: [write]
 * @tagReason: Creates a new record with a single POST and performs no reads or deletes.
 * @pitfalls: Returns only the new record's id because Dataverse responds 204 No Content with no body even when asked to return the created record; call get-record to read field values back. Lookup fields must be set with deep-insert bind syntax (e.g. "parentcustomerid_account@odata.bind": "/accounts(<guid>)"), not plain values. No duplicate detection is applied, so invoking twice with the same payload creates two records.
 */
const action = createAction({
    description: 'Create a record of any Dataverse entity from a field/value payload.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity-web-api
        const response = await nango.post({
            endpoint: `/api/data/v9.2/${encodeURIComponent(input.entitySetName)}`,
            data: input.fields,
            // Create is not idempotent: a retry after a lost response would insert a duplicate record.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        // A successful create returns 204 No Content with the new record URL in the OData-EntityId header, e.g. ".../accounts(<guid>)".
        const rawHeader = response.headers['odata-entityid'];
        const entityIdHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
        const match = typeof entityIdHeader === 'string' ? /\(([0-9a-fA-F-]{36})\)\s*$/.exec(entityIdHeader) : null;
        const id = match?.[1];

        if (!id) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message:
                    'Create returned success but the OData-EntityId response header was missing or malformed, so the new record id could not be determined.',
                entitySetName: input.entitySetName
            });
        }

        return { id };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
