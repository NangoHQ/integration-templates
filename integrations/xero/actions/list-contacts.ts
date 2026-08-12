import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.number().optional().describe('Page number for pagination. Omit for the first page.'),
        pageSize: z.number().optional().describe('Number of contacts to return per page. Default is 100, maximum is 1000.'),
        where: z.string().optional().describe('Xero WHERE clause for filtering contacts. Example: IsCustomer==true'),
        summaryOnly: z.boolean().optional().describe('When true, returns lightweight fields excluding computation-heavy fields like Addresses and Balances.'),
        ifModifiedSince: z.string().optional().describe('RFC 3339 / HTTP-date timestamp. Only returns contacts modified since this time.'),
        includeArchived: z.boolean().optional().describe('When true, includes contacts with a status of ARCHIVED in the response.')
    })
    .describe('Input for listing Xero contacts with filters and pagination.');

const ContactSchema = z
    .object({
        ContactID: z.string().describe('Unique Xero identifier for the contact.'),
        ContactStatus: z.string().optional().describe('Status of the contact: ACTIVE or ARCHIVED.'),
        Name: z.string().optional().describe('Display name of the contact or organisation.'),
        FirstName: z.string().optional().describe('First name of the contact person.'),
        LastName: z.string().optional().describe('Last name of the contact person.'),
        EmailAddress: z.string().optional().describe('Primary email address of the contact.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        contacts: z.array(ContactSchema).describe('Array of Xero contact objects matching the query.'),
        nextPage: z.number().optional().describe('Next page number if more results exist. Omit when there are no more pages.')
    })
    .describe('Output containing the paginated list of Xero contacts.');

const ProviderPaginationSchema = z.object({
    page: z.number(),
    pageSize: z.number(),
    pageCount: z.number(),
    itemCount: z.number()
});

const ProviderContactsResponseSchema = z.object({
    Contacts: z.array(z.unknown()).optional(),
    pagination: ProviderPaginationSchema.optional()
});

const SingleConnectionSchema = z.object({
    tenantId: z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves contact records from the Xero Accounting API.
 * @pitfalls: summaryOnly enforces pagination by default and excludes Addresses, Balances, ContactGroups, ContactPersons, IsCustomer, IsSupplier, and tracking-category fields.
 */
const action = createAction({
    description: 'List contacts with filters and pagination.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.contacts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const connectionConfig = typeof connection.connection_config === 'object' && connection.connection_config !== null ? connection.connection_config : {};
        const metadata = typeof connection.metadata === 'object' && connection.metadata !== null ? connection.metadata : {};

        let tenantId: string | undefined;

        if ('tenant_id' in connectionConfig) {
            const parsed = z.string().safeParse(connectionConfig['tenant_id']);
            if (parsed.success && parsed.data.length > 0) {
                tenantId = parsed.data;
            }
        }

        if (!tenantId && 'tenantId' in metadata) {
            const parsed = z.string().safeParse(metadata['tenantId']);
            if (parsed.success && parsed.data.length > 0) {
                tenantId = parsed.data;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/requests-and-responses#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connections = z.array(SingleConnectionSchema).safeParse(connectionsResponse.data);

            if (!connections.success || connections.data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connections.data.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const first = connections.data[0];
            if (first !== undefined && typeof first.tenantId === 'string' && first.tenantId.length > 0) {
                tenantId = first.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input.ifModifiedSince !== undefined && input.ifModifiedSince.length > 0) {
            headers['If-Modified-Since'] = input.ifModifiedSince;
        }

        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }
        if (input.pageSize !== undefined) {
            params['pageSize'] = input.pageSize;
        }
        if (input.where !== undefined && input.where.length > 0) {
            params['where'] = input.where;
        }
        if (input.summaryOnly !== undefined) {
            params['summaryOnly'] = input.summaryOnly ? 'true' : 'false';
        }
        if (input.includeArchived !== undefined) {
            params['includeArchived'] = input.includeArchived ? 'true' : 'false';
        }

        // https://developer.xero.com/documentation/api/accounting/contacts
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Contacts',
            headers,
            params,
            retries: 3
        });

        const parsedResponse = ProviderContactsResponseSchema.parse(response.data);
        const contacts = parsedResponse.Contacts ?? [];
        const pagination = parsedResponse.pagination;

        let nextPage: number | undefined;
        if (pagination !== undefined) {
            if (pagination.page < pagination.pageCount) {
                nextPage = pagination.page + 1;
            }
        } else if (contacts.length === 100 && input.pageSize === undefined) {
            // Fallback when pagination object is missing and default page size was used
            nextPage = (input.cursor ?? 1) + 1;
        }

        return {
            contacts: contacts.map((contact: unknown) => ContactSchema.parse(contact)),
            ...(nextPage !== undefined && { nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
