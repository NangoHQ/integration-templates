import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        where: z.string().optional().describe('Xero where filter clause. Example: Status == AUTHORISED.'),
        summaryOnly: z.boolean().optional().describe('Return only summary fields when true.'),
        ifModifiedSince: z.string().optional().describe('RFC3339 timestamp. Only records modified since this time are returned.')
    })
    .describe('Input parameters for listing Xero invoices.');

const StringRecordSchema = z.record(z.string(), z.unknown());

const OutputSchema = z
    .object({
        invoices: z.array(StringRecordSchema).describe('List of invoice records returned by Xero.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page, if more results are available.')
    })
    .describe('Output of the list-invoices action, containing invoices and an optional next page cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads invoice data from the Xero Accounting API.
 * @pitfalls: Deleted and voided invoices remain in list results unless explicitly filtered out with `where`; `summaryOnly` causes each returned invoice to contain far fewer fields.
 */
const action = createAction({
    description: 'List invoices with filters and pagination.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        if (connection.connection_config && typeof connection.connection_config === 'object') {
            const cfgResult = StringRecordSchema.safeParse(connection.connection_config);
            if (cfgResult.success && typeof cfgResult.data['tenant_id'] === 'string' && cfgResult.data['tenant_id'].length > 0) {
                tenantId = cfgResult.data['tenant_id'];
            }
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object') {
            const metaResult = StringRecordSchema.safeParse(connection.metadata);
            if (metaResult.success && typeof metaResult.data['tenantId'] === 'string' && metaResult.data['tenantId'].length > 0) {
                tenantId = metaResult.data['tenantId'];
            }
        }

        if (!tenantId) {
            const response = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/overview
                endpoint: 'connections',
                retries: 10
            });
            const connections = z.array(StringRecordSchema).parse(response.data);

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

            const first = connections[0];
            if (first && typeof first === 'object' && typeof first['tenantId'] === 'string' && first['tenantId'].length > 0) {
                tenantId = first['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const params: Record<string, string | number> = {};
        if (input.cursor) {
            const page = parseInt(input.cursor, 10);
            if (!Number.isNaN(page)) {
                params['page'] = page;
            }
        }
        if (input.where) {
            params['where'] = input.where;
        }
        if (input.summaryOnly !== undefined) {
            params['summaryOnly'] = input.summaryOnly ? 'true' : 'false';
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };
        if (input.ifModifiedSince) {
            headers['If-Modified-Since'] = input.ifModifiedSince;
        }

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/invoices
            endpoint: 'api.xro/2.0/Invoices',
            params,
            headers,
            retries: 3
        });

        const raw = StringRecordSchema.parse(response.data);
        const invoices = z.array(StringRecordSchema).parse(raw['Invoices'] ?? []);

        let next_cursor: string | undefined;
        if (invoices.length === 100) {
            const currentPage = input.cursor ? parseInt(input.cursor, 10) : 1;
            if (!Number.isNaN(currentPage)) {
                next_cursor = String(currentPage + 1);
            }
        }

        return {
            invoices,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
