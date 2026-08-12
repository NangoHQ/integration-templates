import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        contact_id: z.string().describe('The Xero ContactID of the contact to retrieve. Example: "ba8306fe-f1ec-46fc-a34f-2e0044da96d7"')
    })
    .describe('Input for retrieving a single Xero contact by ContactID.');

const OutputSchema = z
    .object({
        ContactID: z.string().describe('Unique identifier for the contact in Xero. Example: "ba8306fe-f1ec-46fc-a34f-2e0044da96d7"'),
        ContactStatus: z.string().optional().describe('Status of the contact. Examples: "ACTIVE", "ARCHIVED".'),
        Name: z.string().optional().describe('Full name of the contact or organization.'),
        FirstName: z.string().optional().describe('First name of the contact person.'),
        LastName: z.string().optional().describe('Last name of the contact person.'),
        EmailAddress: z.string().optional().describe('Primary email address of the contact.'),
        ContactNumber: z.string().optional().describe('Xero-generated contact number.'),
        AccountNumber: z.string().optional().describe('User-defined account number for the contact.'),
        UpdatedDateUTC: z.string().optional().describe('UTC timestamp when the contact was last updated.'),
        IsSupplier: z.boolean().optional().describe('Whether the contact is flagged as a supplier.'),
        IsCustomer: z.boolean().optional().describe('Whether the contact is flagged as a customer.'),
        BankAccountDetails: z.string().optional().describe('Bank account number associated with the contact.'),
        TaxNumber: z.string().optional().describe('Tax number associated with the contact.'),
        Addresses: z.array(z.object({}).passthrough()).optional().describe('List of physical addresses for the contact.'),
        Phones: z.array(z.object({}).passthrough()).optional().describe('List of phone numbers for the contact.')
    })
    .describe('A single Xero contact record.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing contact from Xero by ContactID.
 * @pitfalls: If the connection is linked to multiple Xero tenants, the action throws an error rather than guessing which tenant to use — the caller must first run get-tenants to pin a tenant. Archived contacts remain fully retrievable and return ContactStatus "ARCHIVED".
 */
const action = createAction({
    description: 'Retrieve a contact by ContactID.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.contacts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const connectionConfigSchema = z.object({
            tenant_id: z.string().optional()
        });
        const parsedConfig = connectionConfigSchema.safeParse(connection.connection_config);
        let tenantId: string | undefined;
        if (parsedConfig.success && parsedConfig.data.tenant_id) {
            tenantId = parsedConfig.data.tenant_id;
        }

        if (!tenantId) {
            const metadataSchema = z.object({
                tenantId: z.string().optional()
            });
            const parsedMetadata = metadataSchema.safeParse(connection.metadata);
            if (parsedMetadata.success && parsedMetadata.data.tenantId) {
                tenantId = parsedMetadata.data.tenantId;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const rawConnections = connectionsResponse.data;
            if (!Array.isArray(rawConnections) || rawConnections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (rawConnections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const connectionsArraySchema = z.array(
                z.object({
                    tenantId: z.string().optional()
                })
            );
            const connectionsArray = connectionsArraySchema.parse(rawConnections);
            const [firstConnection] = connectionsArray;
            if (firstConnection?.tenantId && firstConnection.tenantId.length > 0) {
                tenantId = firstConnection.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.get({
            endpoint: `api.xro/2.0/Contacts/${encodeURIComponent(input.contact_id)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const providerResponseSchema = z.object({
            Contacts: z.array(z.unknown()).optional()
        });
        const providerResponse = providerResponseSchema.parse(response.data);
        if (!providerResponse.Contacts || providerResponse.Contacts.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found.'
            });
        }

        const [firstContact] = providerResponse.Contacts;
        if (!firstContact) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found.'
            });
        }

        const contact = OutputSchema.parse(firstContact);
        return contact;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
