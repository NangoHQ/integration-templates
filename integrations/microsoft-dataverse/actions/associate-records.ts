import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        entitySetName: z
            .string()
            .describe(
                'Entity set (collection) name of the primary record that owns the relationship, e.g. "contacts". Use the list-entity-definitions action to discover the entity set names available in the org.'
            ),
        id: z.string().describe('GUID of the primary record that owns the navigation property. Example: "ed1c5323-2bbc-f111-aaad-7ced8d717fa5"'),
        navigationProperty: z
            .string()
            .describe('Schema name of the navigation property on the primary record, e.g. "parentcustomerid_account" to link a contact to its parent account.'),
        relationshipType: z
            .enum(['single', 'collection'])
            .describe(
                'Whether navigationProperty is a single-valued navigation property (a lookup field such as "parentcustomerid_account", which Dataverse associates with PUT) or a collection-valued navigation property (a one-to-many "many" side or many-to-many relationship, which Dataverse associates with POST). This cannot be inferred from the property name alone; look it up via list-entity-attributes/list-entity-definitions or the relationship metadata for the entity if unsure.'
            ),
        relatedEntitySetName: z.string().describe('Entity set (collection) name of the related record to link to, e.g. "accounts".'),
        relatedId: z.string().describe('GUID of the related record to link. Example: "e91c5323-2bbc-f111-aaad-7ced8d717fa5"'),
        environmentUrl: z
            .string()
            .describe(
                'Host name of the Dataverse environment (org URL) from the connection configuration, with or without the https:// prefix, e.g. "org98374485.crm.dynamics.com". Dataverse requires the related record to be referenced by its absolute URL.'
            )
    })
    .describe(
        'Parameters for linking two records: the primary record, the navigation property on it, the related record to link, and the org URL used to build the absolute related-record URL that Dataverse requires.'
    );

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Dataverse accepted the association (HTTP 204 No Content).')
    })
    .describe('Result of the association request. Dataverse returns 204 No Content on success, so this only confirms the link was accepted.');

/**
 * @tags: [write]
 * @tagReason: Creates a relationship link between two records in Dataverse; no provider reads are performed.
 * @pitfalls: Associating through a single-valued (lookup) navigation property replaces any existing link on the record rather than failing. Re-associating a pair that is already linked also succeeds with no indication that nothing changed, so a success output does not prove a new link was created. Passing the wrong relationshipType for navigationProperty causes Dataverse to reject the request (PUT on a collection-valued property, or POST on a single-valued property, both fail).
 */
const action = createAction({
    description: 'Create a relationship link between two records via a navigation property.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const orgUrl = `https://${input.environmentUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
        const endpoint = `/api/data/v9.2/${encodeURIComponent(input.entitySetName)}(${encodeURIComponent(input.id)})/${encodeURIComponent(input.navigationProperty)}/$ref`;
        const data = {
            '@odata.id': `${orgUrl}/api/data/v9.2/${encodeURIComponent(input.relatedEntitySetName)}(${encodeURIComponent(input.relatedId)})`
        };

        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/associate-disassociate-entities-using-web-api
        // Dataverse requires PUT to set a single-valued (lookup) navigation property and POST to add a member to a
        // collection-valued navigation property; sending the wrong verb for the property's cardinality is rejected.
        if (input.relationshipType === 'single') {
            // PUT replaces the lookup's referenced record, so retrying after a lost response reapplies the same value and stays idempotent.
            await nango.put({
                endpoint,
                data,
                retries: 3
            });
        } else {
            await nango.post({
                endpoint,
                data,
                // Retries are disabled: this POST adds a member to a collection with no idempotency key, so retrying after a lost response risks ambiguity about whether the first attempt already succeeded.
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- deliberate retries: 0 for a non-idempotent write; the rule's auto-fix would otherwise rewrite it to 10
                retries: 0
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
