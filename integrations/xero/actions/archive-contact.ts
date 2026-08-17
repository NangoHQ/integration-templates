import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        contactId: z.string().describe('The Xero ContactID to archive. Example: "de917205-1599-4dd4-b319-4adf72eadfe3"')
    })
    .describe('Input for archiving a Xero contact.');

const OutputSchema = z
    .object({
        contactId: z.string().describe('The archived contact ID.'),
        name: z.string().optional().describe('The contact name.'),
        contactStatus: z.string().optional().describe('The contact status after archiving.'),
        updatedDateUTC: z.string().optional().describe('The timestamp when the contact was last updated.')
    })
    .describe('Output returned after archiving a Xero contact.');

const ProviderContactSchema = z.object({
    ContactID: z.string(),
    Name: z.string().optional(),
    ContactStatus: z.string().optional(),
    UpdatedDateUTC: z.string().optional()
});

const ProviderContactsResponseSchema = z.object({
    Contacts: z.array(ProviderContactSchema).optional()
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish()
});

const ConnectionsResponseSchema = z.object({
    data: z.array(z.record(z.string(), z.unknown())).optional()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Archives the contact via a provider mutation, which is a difficult-to-reverse state change.
 * @pitfalls: Archiving is irreversible via the API, and re-invoking this action on an already-archived contact returns a 400 ValidationException because archived contacts are frozen.
 */
const action = createAction({
    description: "Archive a contact (Xero's only delete mechanism for contacts).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.contacts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        async function resolveTenantId(): Promise<string> {
            const connection = ConnectionSchema.parse(await nango.getConnection());

            const configTenantId = connection.connection_config?.['tenant_id'];
            if (typeof configTenantId === 'string' && configTenantId.length > 0) {
                return configTenantId;
            }

            const metadataTenantId = connection.metadata?.['tenantId'];
            if (typeof metadataTenantId === 'string' && metadataTenantId.length > 0) {
                return metadataTenantId;
            }

            // https://developer.xero.com/documentation/guides/oauth2/scopes/
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const parsed = ConnectionsResponseSchema.parse(connectionsResponse.data);
            const connections = parsed.data ?? [];

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connections[0];
            if (firstConnection === undefined) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'Unable to resolve xero-tenant-id.'
                });
            }

            const tenantId = firstConnection['tenantId'];
            if (typeof tenantId !== 'string' || tenantId.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'Unable to resolve xero-tenant-id.'
                });
            }

            return tenantId;
        }

        const tenantId = await resolveTenantId();

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.post({
            endpoint: 'api.xro/2.0/Contacts',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Contacts: [
                    {
                        ContactID: input.contactId,
                        ContactStatus: 'ARCHIVED'
                    }
                ]
            },
            retries: 1
        });

        const parsed = ProviderContactsResponseSchema.parse(response.data);
        const contacts = parsed.Contacts ?? [];

        if (contacts.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found or could not be archived.',
                contactId: input.contactId
            });
        }

        const contact = contacts[0];
        if (contact === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found or could not be archived.',
                contactId: input.contactId
            });
        }

        return {
            contactId: contact.ContactID,
            ...(contact.Name !== undefined && { name: contact.Name }),
            ...(contact.ContactStatus !== undefined && { contactStatus: contact.ContactStatus }),
            ...(contact.UpdatedDateUTC !== undefined && { updatedDateUTC: contact.UpdatedDateUTC })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
