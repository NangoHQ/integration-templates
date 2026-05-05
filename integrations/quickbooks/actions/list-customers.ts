import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (STARTPOSITION value). Omit for the first page.')
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const CustomerSchema = z.object({
    Id: z.string(),
    DisplayName: z.string().optional(),
    GivenName: z.string().optional(),
    FamilyName: z.string().optional(),
    CompanyName: z.string().optional(),
    Active: z.boolean().optional(),
    PrimaryEmailAddr: z
        .object({
            Address: z.string().optional()
        })
        .optional(),
    PrimaryPhone: z
        .object({
            FreeFormNumber: z.string().optional()
        })
        .optional(),
    MetaData: MetaDataSchema.optional()
});

const QueryResponseSchema = z.object({
    Customer: z.array(CustomerSchema).optional()
});

const ProviderResponseSchema = z.object({
    QueryResponse: QueryResponseSchema
});

const OutputItemSchema = z.object({
    id: z.string(),
    display_name: z.string().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    company_name: z.string().optional(),
    active: z.boolean().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
});

async function getRealmId(nango: { getConnection: () => Promise<{ connection_config?: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (typeof realmId !== 'string' || !realmId) {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

const action = createAction({
    description: 'List customers with the QuickBooks query endpoint.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-customers',
        group: 'Customers'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);

        let startPosition = 1;
        if (input.cursor) {
            const n = Number(input.cursor);
            if (!Number.isInteger(n) || n < 1) {
                throw new nango.ActionError({ type: 'invalid_cursor', message: 'Cursor must be a positive integer.' });
            }
            startPosition = n;
        }
        const maxResults = 100;

        const query = `SELECT * FROM Customer STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/query
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
            params: { query },
            headers: { 'Content-Type': 'text/plain' },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const customers = parsed.QueryResponse.Customer ?? [];

        const items = customers.map((customer) => ({
            id: customer.Id,
            ...(customer.DisplayName !== undefined && { display_name: customer.DisplayName }),
            ...(customer.GivenName !== undefined && { given_name: customer.GivenName }),
            ...(customer.FamilyName !== undefined && { family_name: customer.FamilyName }),
            ...(customer.CompanyName !== undefined && { company_name: customer.CompanyName }),
            ...(customer.Active !== undefined && { active: customer.Active }),
            ...(customer.PrimaryEmailAddr?.Address !== undefined && { email: customer.PrimaryEmailAddr.Address }),
            ...(customer.PrimaryPhone?.FreeFormNumber !== undefined && { phone: customer.PrimaryPhone.FreeFormNumber }),
            ...(customer.MetaData?.CreateTime !== undefined && { created_at: customer.MetaData.CreateTime }),
            ...(customer.MetaData?.LastUpdatedTime !== undefined && { updated_at: customer.MetaData.LastUpdatedTime })
        }));

        const nextCursor = customers.length === maxResults ? String(startPosition + maxResults) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
