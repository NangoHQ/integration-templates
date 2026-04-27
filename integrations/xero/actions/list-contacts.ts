import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Example: 1'),
    where: z.string().optional().describe('Xero where filter clause. Example: Name.Contains("John")'),
    summaryOnly: z.boolean().optional().describe('Return only summary fields'),
    ifModifiedSince: z.string().optional().describe('RFC 7231 datetime string for If-Modified-Since header')
});

const ContactSchema = z
    .object({
        ContactID: z.string(),
        Name: z.string().optional(),
        ContactStatus: z.string().optional(),
        FirstName: z.string().optional(),
        LastName: z.string().optional(),
        EmailAddress: z.string().optional(),
        BankAccountDetails: z.string().optional(),
        TaxNumber: z.string().optional(),
        AccountsReceivableTaxType: z.string().optional(),
        AccountsPayableTaxType: z.string().optional(),
        IsSupplier: z.boolean().optional(),
        IsCustomer: z.boolean().optional(),
        DefaultCurrency: z.string().optional(),
        UpdatedDateUTC: z.string().optional(),
        Website: z.string().optional(),
        HasAttachments: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    contacts: z.array(ContactSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List contacts with filters and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-contacts',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.contacts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const connectionSchema = z.object({
            connection_config: z.record(z.string(), z.unknown()).optional(),
            metadata: z.record(z.string(), z.unknown()).optional()
        });
        const parsedConnection = connectionSchema.parse(connection);

        let tenantId: string | undefined;

        if (parsedConnection.connection_config) {
            const candidate = parsedConnection.connection_config['tenant_id'];
            if (typeof candidate === 'string' && candidate.length > 0) {
                tenantId = candidate;
            }
        }

        if (!tenantId && parsedConnection.metadata) {
            const candidate = parsedConnection.metadata['tenantId'];
            if (typeof candidate === 'string' && candidate.length > 0) {
                tenantId = candidate;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/overview/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsArraySchema = z.array(z.record(z.string(), z.unknown()));
            const connectionsArray = connectionsArraySchema.parse(connectionsResponse.data);

            if (connectionsArray.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsArray.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connectionsArray[0];
            if (firstConnection && typeof firstConnection === 'object') {
                const candidate = firstConnection['tenantId'];
                if (typeof candidate === 'string') {
                    tenantId = candidate;
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'no_tenant',
                message: 'Unable to resolve Xero tenant ID.'
            });
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input['ifModifiedSince'] && input['ifModifiedSince'].length > 0) {
            headers['If-Modified-Since'] = input['ifModifiedSince'];
        }

        const params: Record<string, string> = {};
        if (input['page'] !== undefined) {
            params['page'] = String(input['page']);
        }
        if (input['where'] && input['where'].length > 0) {
            params['where'] = input['where'];
        }
        if (input['summaryOnly'] !== undefined) {
            params['summaryOnly'] = String(input['summaryOnly']);
        }

        // https://developer.xero.com/documentation/api/accounting/contacts
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Contacts',
            headers,
            params,
            retries: 3
        });

        const contactsResponseSchema = z.object({
            Contacts: z.array(z.record(z.string(), z.unknown()))
        });
        const parsedResponse = contactsResponseSchema.parse(response.data);
        const contacts = parsedResponse.Contacts.map((contact) => ContactSchema.parse(contact));

        const currentPage = input['page'] || 1;
        const nextPage = contacts.length === 100 ? currentPage + 1 : undefined;

        const result: z.infer<typeof OutputSchema> = {
            contacts
        };
        if (nextPage !== undefined) {
            result.next_page = nextPage;
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
