import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Defaults to 1.'),
    where: z.string().optional().describe('A filter expression in Xero query syntax.'),
    summary_only: z.boolean().optional().describe('Return a simplified response with limited contact details.'),
    modified_since: z.string().optional().describe('Return only contacts modified since this ISO 8601 timestamp.')
});

const ContactSchema = z.object({
    ContactID: z.string(),
    Name: z.string(),
    EmailAddress: z.union([z.string(), z.null()]),
    FirstName: z.union([z.string(), z.null()]),
    LastName: z.union([z.string(), z.null()]),
    Status: z.union([z.string(), z.null()]),
    IsSupplier: z.union([z.boolean(), z.null()]),
    IsCustomer: z.union([z.boolean(), z.null()])
});

const OutputSchema = z.object({
    contacts: z.array(ContactSchema),
    has_more: z.boolean()
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function mapContact(contact: unknown) {
    if (isRecord(contact)) {
        return {
            ContactID: typeof contact['ContactID'] === 'string' ? contact['ContactID'] : '',
            Name: typeof contact['Name'] === 'string' ? contact['Name'] : '',
            EmailAddress: typeof contact['EmailAddress'] === 'string' ? contact['EmailAddress'] : null,
            FirstName: typeof contact['FirstName'] === 'string' ? contact['FirstName'] : null,
            LastName: typeof contact['LastName'] === 'string' ? contact['LastName'] : null,
            Status: typeof contact['ContactStatus'] === 'string' ? contact['ContactStatus'] : null,
            IsSupplier: typeof contact['IsSupplier'] === 'boolean' ? contact['IsSupplier'] : null,
            IsCustomer: typeof contact['IsCustomer'] === 'boolean' ? contact['IsCustomer'] : null
        };
    }
    return {
        ContactID: '',
        Name: '',
        EmailAddress: null,
        FirstName: null,
        LastName: null,
        Status: null,
        IsSupplier: null,
        IsCustomer: null
    };
}

// https://developer.xero.com/documentation/api/accounting/contacts
const action = createAction({
    description: 'List contacts with filters and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-contacts',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.contacts', 'accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        // Resolve tenant_id
        const tenantId = connection.connection_config?.['tenant_id'] ?? connection.metadata?.['tenantId'];

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;
            if (Array.isArray(connectionsData) && connectionsData.length > 0) {
                if (connectionsData.length > 1) {
                    throw new nango.ActionError({
                        type: 'multiple_tenants',
                        message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                    });
                }
                const tenantIdFromConnection = connectionsData[0]?.['tenantId'];
                if (typeof tenantIdFromConnection === 'string') {
                    const finalResponse = await nango.get({
                        // https://developer.xero.com/documentation/api/accounting/contacts
                        endpoint: 'api.xro/2.0/Contacts',
                        headers: {
                            'xero-tenant-id': tenantIdFromConnection,
                            ...(input.modified_since && {
                                'If-Modified-Since': input.modified_since
                            })
                        },
                        params: {
                            ...(input.page && { page: input.page.toString() }),
                            ...(input.where && { where: input.where }),
                            ...(input.summary_only && {
                                summaryOnly: input.summary_only.toString()
                            })
                        },
                        retries: 3
                    });

                    const data = finalResponse.data;
                    if (isRecord(data) && 'Contacts' in data && Array.isArray(data['Contacts'])) {
                        return {
                            contacts: data['Contacts'].map(mapContact),
                            has_more: data['Contacts'].length === 100
                        };
                    }
                    return { contacts: [], has_more: false };
                }
            }
            throw new nango.ActionError({
                type: 'no_tenant',
                message: 'No tenant found. Please configure tenant_id in connection_config or tenantId in metadata.'
            });
        }

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/contacts
            endpoint: 'api.xro/2.0/Contacts',
            headers: {
                'xero-tenant-id': tenantId,
                ...(input.modified_since && {
                    'If-Modified-Since': input.modified_since
                })
            },
            params: {
                ...(input.page && { page: input.page.toString() }),
                ...(input.where && { where: input.where }),
                ...(input.summary_only && { summaryOnly: input.summary_only.toString() })
            },
            retries: 3
        });

        const data = response.data;
        if (isRecord(data) && 'Contacts' in data && Array.isArray(data['Contacts'])) {
            return {
                contacts: data['Contacts'].map(mapContact),
                has_more: data['Contacts'].length === 100
            };
        }
        return { contacts: [], has_more: false };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
