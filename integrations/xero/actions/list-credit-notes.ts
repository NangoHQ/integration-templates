import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor (1-based page number) from the previous response. Omit for the first page.'),
        where: z.string().optional().describe('Xero WHERE query filter expression. Example: "Status==\\"AUTHORISED\\""'),
        order: z.string().optional().describe('Xero ORDER BY clause. Example: "UpdatedDateUTC DESC"'),
        ifModifiedSince: z.string().optional().describe('RFC 3339 timestamp. Only records modified since this time are returned.')
    })
    .describe('Input for listing Xero credit notes.');

const ProviderPaginationSchema = z.object({
    page: z.number(),
    pageSize: z.number(),
    pageCount: z.number(),
    itemCount: z.number()
});

const ProviderResponseSchema = z.object({
    CreditNotes: z.array(z.object({}).passthrough()),
    pagination: ProviderPaginationSchema.optional()
});

const OutputSchema = z
    .object({
        CreditNotes: z.array(z.object({}).passthrough()).describe('The credit notes returned by Xero.'),
        NextPage: z.string().optional().describe('The next page cursor if more pages exist.')
    })
    .describe('Output for listing Xero credit notes.');

/**
 * @tags: [read]
 * @tagReason: Reads credit notes from the Xero Accounting API.
 * @pitfalls: List results include DELETED and VOIDED credit notes unless filtered with `where`; an AUTHORISED credit note must be VOIDED before it can be marked DELETED. The response wraps root-level fields in PascalCase (e.g. CreditNotes, Status) but the pagination object itself is camelCase (page, pageSize, pageCount, itemCount) — do not assume PascalCase for pagination fields.
 */
const action = createAction({
    description: 'List credit notes with filters and pagination.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const rawConnection = z
            .object({
                connection_config: z.record(z.string(), z.unknown()).nullish(),
                metadata: z.record(z.string(), z.unknown()).nullish()
            })
            .parse(connection);

        let tenantId: string | undefined;
        const connectionConfig = rawConnection.connection_config;
        if (connectionConfig && typeof connectionConfig['tenant_id'] === 'string' && connectionConfig['tenant_id'].length > 0) {
            tenantId = connectionConfig['tenant_id'];
        }

        if (!tenantId) {
            const metadata = rawConnection.metadata;
            if (metadata && typeof metadata['tenantId'] === 'string' && metadata['tenantId'].length > 0) {
                tenantId = metadata['tenantId'];
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/overview/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const rawConnections = z.array(z.record(z.string(), z.unknown())).parse(connectionsResponse.data);
            if (rawConnections.length === 0) {
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
            const firstTenant = rawConnections[0];
            if (firstTenant !== undefined && typeof firstTenant['tenantId'] === 'string' && firstTenant['tenantId'].length > 0) {
                tenantId = firstTenant['tenantId'];
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

        const params: Record<string, string> = {};
        if (input.where !== undefined && input.where.length > 0) {
            params['where'] = input.where;
        }
        if (input.order !== undefined && input.order.length > 0) {
            params['order'] = input.order;
        }
        if (input.cursor !== undefined && input.cursor.length > 0) {
            params['page'] = input.cursor;
        }

        // https://developer.xero.com/documentation/api/accounting/creditnotes
        const response = await nango.get({
            endpoint: 'api.xro/2.0/CreditNotes',
            headers,
            params,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const pagination = providerData.pagination;

        let nextPage: string | undefined;
        if (pagination !== undefined && pagination.page < pagination.pageCount) {
            nextPage = String(pagination.page + 1);
        }

        return {
            CreditNotes: providerData.CreditNotes,
            ...(nextPage !== undefined && { NextPage: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
