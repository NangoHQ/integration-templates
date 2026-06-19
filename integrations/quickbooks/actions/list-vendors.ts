import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (STARTPOSITION). Omit for the first page.')
});

const QueryResponseSchema = z.object({
    QueryResponse: z.object({
        Vendor: z
            .array(
                z.object({
                    Id: z.string(),
                    DisplayName: z.string().optional(),
                    GivenName: z.string().optional(),
                    FamilyName: z.string().optional(),
                    CompanyName: z.string().optional(),
                    Active: z.boolean().optional(),
                    PrimaryEmailAddr: z.object({ Address: z.string().optional() }).optional(),
                    PrimaryPhone: z.object({ FreeFormNumber: z.string().optional() }).optional(),
                    MetaData: z
                        .object({
                            CreateTime: z.string().optional(),
                            LastUpdatedTime: z.string().optional()
                        })
                        .optional()
                })
            )
            .optional(),
        maxResults: z.number().optional(),
        startPosition: z.number().optional(),
        totalCount: z.number().optional()
    })
});

const VendorOutputSchema = z.object({
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
    vendors: z.array(VendorOutputSchema),
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
    description: 'List vendors with the QuickBooks query endpoint.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

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

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/vendor#query-a-vendor
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
            params: {
                query: `SELECT * FROM Vendor STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`
            },
            retries: 3
        });

        const parsed = QueryResponseSchema.parse(response.data);
        const vendors = parsed.QueryResponse.Vendor ?? [];
        const totalCount = parsed.QueryResponse.totalCount ?? 0;

        const mappedVendors = vendors.map((vendor) => ({
            id: vendor.Id,
            ...(vendor.DisplayName !== undefined && { display_name: vendor.DisplayName }),
            ...(vendor.GivenName !== undefined && { given_name: vendor.GivenName }),
            ...(vendor.FamilyName !== undefined && { family_name: vendor.FamilyName }),
            ...(vendor.CompanyName !== undefined && { company_name: vendor.CompanyName }),
            ...(vendor.Active !== undefined && { active: vendor.Active }),
            ...(vendor.PrimaryEmailAddr?.Address !== undefined && { email: vendor.PrimaryEmailAddr.Address }),
            ...(vendor.PrimaryPhone?.FreeFormNumber !== undefined && { phone: vendor.PrimaryPhone.FreeFormNumber }),
            ...(vendor.MetaData?.CreateTime !== undefined && { created_at: vendor.MetaData.CreateTime }),
            ...(vendor.MetaData?.LastUpdatedTime !== undefined && { updated_at: vendor.MetaData.LastUpdatedTime })
        }));

        const currentPosition = parsed.QueryResponse.startPosition ?? startPosition;
        const returnedCount = vendors.length;
        const hasMore = currentPosition + returnedCount - 1 < totalCount && returnedCount === maxResults;

        return {
            vendors: mappedVendors,
            ...(hasMore && { next_cursor: String(currentPosition + maxResults) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
