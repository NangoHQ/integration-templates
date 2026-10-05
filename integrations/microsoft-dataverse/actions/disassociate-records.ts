import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        entitySetName: z
            .string()
            .min(1)
            .describe(
                'Entity set name (plural collection name) of the primary record, e.g. "contacts". Discover valid values for the org with the list-entity-definitions action.'
            ),
        id: z.string().min(1).describe('GUID of the primary record that currently holds the relationship. Example: "3f2504e0-4f89-11d3-9a0c-0305e82c3301"'),
        navigationProperty: z
            .string()
            .min(1)
            .describe(
                'Schema name of the navigation property whose link should be removed, e.g. "parentcustomerid_account" (a contact\'s parent account lookup).'
            ),
        relatedId: z
            .string()
            .min(1)
            .optional()
            .describe(
                'GUID of the related record. Required for collection-valued (N:N) navigation properties; omit for single-valued (N:1 lookup) navigation properties.'
            )
    })
    .describe(
        'Relationship link to remove: the primary record (entitySetName + id), the navigation property, and — for collection-valued relationships only — the related record id.'
    );

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Dataverse removed the relationship link (HTTP 204 No Content).')
    })
    .describe('Result of the disassociate call. Dataverse returns no body on success, so success is derived from the HTTP status.');

/**
 * @tags: [write, destructive]
 * @tagReason: Sends a DELETE to the provider that removes an existing relationship link between two records; clearing an association is a difficult-to-reverse change because the previous link value is not recorded anywhere.
 * @pitfalls: relatedId is required for collection-valued (N:N) navigation properties and must be omitted for single-valued (N:1) lookups — the two relationship shapes are addressed differently. Only the link is removed; neither record is deleted. The provider also reports success when the link was already absent, so a successful result does not prove a link existed.
 */
const action = createAction({
    description: 'Remove a relationship link between two records via a navigation property.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const primaryRecord = `/api/data/v9.2/${encodeURIComponent(input.entitySetName)}(${encodeURIComponent(input.id)})`;
        const endpoint = input.relatedId
            ? `${primaryRecord}/${encodeURIComponent(input.navigationProperty)}(${encodeURIComponent(input.relatedId)})/$ref`
            : `${primaryRecord}/${encodeURIComponent(input.navigationProperty)}/$ref`;

        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/associate-disassociate-entities-using-web-api
        await nango.delete({
            endpoint,
            // Verified live: repeating DELETE $ref on an already-removed link still returns 204 (no-op), so a retry after a lost response is safe.
            retries: 2
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
