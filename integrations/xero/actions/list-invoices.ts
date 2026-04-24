import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.string().optional().describe('Page number for pagination. Example: "1"'),
    where: z.string().optional().describe('Xero filter string. Example: \'Type=="ACCREC"\''),
    summaryOnly: z.boolean().optional().describe('Return summary only. Example: true'),
    modifiedSince: z.string().optional().describe('If-Modified-Since header in UTC timestamp format. Example: "2023-01-01T00:00:00Z"')
});

const ProviderInvoiceSchema = z.object({}).passthrough();

const ProviderResponseSchema = z.object({
    Id: z.string().optional(),
    Status: z.string().optional(),
    ProviderName: z.string().optional(),
    DateTimeUTC: z.string().optional(),
    Invoices: z.array(ProviderInvoiceSchema).optional()
});

const OutputSchema = z.object({
    invoices: z.array(ProviderInvoiceSchema),
    next_page: z.string().optional()
});

const action = createAction({
    description: 'List invoices with filters and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const ConnectionSchema = z.object({
            connection_config: z.record(z.string(), z.unknown()).optional(),
            metadata: z.record(z.string(), z.unknown()).optional()
        });

        const parsedConnection = ConnectionSchema.parse(connection);

        let tenantId: string | undefined;

        if (
            parsedConnection.connection_config &&
            'tenant_id' in parsedConnection.connection_config &&
            typeof parsedConnection.connection_config['tenant_id'] === 'string'
        ) {
            tenantId = parsedConnection.connection_config['tenant_id'];
        }

        if (
            tenantId === undefined &&
            parsedConnection.metadata &&
            'tenantId' in parsedConnection.metadata &&
            typeof parsedConnection.metadata['tenantId'] === 'string'
        ) {
            tenantId = parsedConnection.metadata['tenantId'];
        }

        if (tenantId === undefined) {
            const response = await nango.get({
                // https://developer.xero.com/documentation/guides/oauth2/tenants
                endpoint: 'connections',
                retries: 10
            });

            const ConnectionsSchema = z.array(z.object({}).passthrough());
            const connectionsData = ConnectionsSchema.parse(response.data);

            if (connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenant found for this connection.'
                });
            }

            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connectionsData[0];
            if (firstConnection === undefined) {
                throw new nango.ActionError({
                    type: 'invalid_tenant',
                    message: 'Unable to resolve a valid Xero tenant ID.'
                });
            }

            const candidate = firstConnection['tenantId'];
            if (typeof candidate === 'string') {
                tenantId = candidate;
            }
        }

        if (tenantId === undefined) {
            throw new nango.ActionError({
                type: 'invalid_tenant',
                message: 'Unable to resolve a valid Xero tenant ID.'
            });
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input.modifiedSince !== undefined) {
            headers['If-Modified-Since'] = input.modifiedSince;
        }

        const params: Record<string, string> = {};

        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.where !== undefined) {
            params['where'] = input.where;
        }
        if (input.summaryOnly !== undefined) {
            params['summaryOnly'] = String(input.summaryOnly);
        }

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/invoices
            endpoint: 'api.xro/2.0/Invoices',
            headers: headers,
            params: params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const invoices = parsed.Invoices || [];

        let nextPage: string | undefined;
        if (invoices.length === 100) {
            const currentPage = input.page !== undefined ? parseInt(input.page, 10) : 1;
            if (!Number.isNaN(currentPage)) {
                nextPage = String(currentPage + 1);
            }
        }

        return {
            invoices: invoices,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
