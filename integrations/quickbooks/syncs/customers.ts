import { createSync } from 'nango';
import { z } from 'zod';

// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer
const CustomerSchema = z.object({
    Id: z.string(),
    Active: z.boolean().optional(),
    FullyQualifiedName: z.string().optional(),
    CompanyName: z.string().optional(),
    DisplayName: z.string().optional(),
    PrintOnCheckName: z.string().optional(),
    BillAddr: z
        .object({
            Line1: z.string().optional(),
            City: z.string().optional(),
            CountrySubDivisionCode: z.string().optional(),
            PostalCode: z.string().optional()
        })
        .optional(),
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
    Mobile: z
        .object({
            FreeFormNumber: z.string().optional()
        })
        .optional(),
    MetaData: z.object({
        CreateTime: z.string().optional(),
        LastUpdatedTime: z.string()
    })
});

const QueryResponseSchema = z.object({
    QueryResponse: z.object({
        Customer: z.array(CustomerSchema).optional()
    })
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const CustomerModelSchema = z.object({
    id: z.string(),
    active: z.boolean(),
    fully_qualified_name: z.string().optional(),
    company_name: z.string().optional(),
    display_name: z.string().optional(),
    print_on_check_name: z.string().optional(),
    billing_address_line1: z.string().optional(),
    billing_city: z.string().optional(),
    billing_state: z.string().optional(),
    billing_postal_code: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string()
});

async function getRealmId(nango: { getConnection: () => Promise<{ connection_config: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

function toCustomer(raw: z.infer<typeof CustomerSchema>): z.infer<typeof CustomerModelSchema> {
    return {
        id: raw.Id,
        active: raw.Active ?? true,
        fully_qualified_name: raw.FullyQualifiedName,
        company_name: raw.CompanyName,
        display_name: raw.DisplayName,
        print_on_check_name: raw.PrintOnCheckName,
        billing_address_line1: raw.BillAddr?.Line1,
        billing_city: raw.BillAddr?.City,
        billing_state: raw.BillAddr?.CountrySubDivisionCode,
        billing_postal_code: raw.BillAddr?.PostalCode,
        email: raw.PrimaryEmailAddr?.Address,
        phone: raw.PrimaryPhone?.FreeFormNumber,
        mobile: raw.Mobile?.FreeFormNumber,
        created_at: raw.MetaData?.CreateTime,
        updated_at: raw.MetaData.LastUpdatedTime
    };
}

const sync = createSync<{ Customer: typeof CustomerModelSchema }, undefined, typeof CheckpointSchema>({
    description: 'Sync customer records from QuickBooks Online.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/customers' }],
    checkpoint: CheckpointSchema,
    models: {
        Customer: CustomerModelSchema
    },

    exec: async (nango) => {
        const realmId = await getRealmId(nango);
        const checkpoint = await nango.getCheckpoint();

        const MAX_LOOKBACK_DAYS = 29;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);
        const useIncremental = checkpoint && checkpoint.updated_after && new Date(checkpoint.updated_after) > cutoff;

        if (useIncremental) {
            // CDC path: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-visited/changedatacapture
            const proxyConfig: {
                endpoint: string;
                params: { entities: string; changedSince: string };
                headers: { 'Content-Type': string };
                paginate: {
                    type: 'offset';
                    offset_name_in_request: string;
                    response_path: string;
                    limit_name_in_request: string;
                    limit: number;
                };
                retries: number;
            } = {
                endpoint: `/v3/company/${encodeURIComponent(realmId)}/cdc`,
                params: { entities: 'Customer', changedSince: checkpoint.updated_after },
                headers: { 'Content-Type': 'text/plain' },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'startPosition',
                    response_path: 'CDCResponse[0].QueryResponse[0].Customer',
                    limit_name_in_request: 'maxResults',
                    limit: 1000
                },
                retries: 3
            };
            for await (const records of nango.paginate(proxyConfig)) {
                const parsedRecords = z.array(CustomerSchema).safeParse(records);
                if (!parsedRecords.success) {
                    throw new Error(`Failed to parse CDC records: ${parsedRecords.error.message}`);
                }

                const validRecords = parsedRecords.data;
                const active = validRecords.filter((r) => r.Active !== false);
                const deleted = validRecords.filter((r) => r.Active === false);
                if (active.length > 0) {
                    await nango.batchSave(active.map(toCustomer), 'Customer');
                }
                if (deleted.length > 0) {
                    await nango.batchDelete(
                        deleted.map((r) => ({ id: r.Id })),
                        'Customer'
                    );
                }
                const latest = validRecords.reduce((max: string, r) => {
                    const time = r.MetaData?.LastUpdatedTime;
                    return time && time > max ? time : max;
                }, '');
                if (latest) {
                    await nango.saveCheckpoint({ updated_after: latest });
                }
            }
        } else {
            // Full query path: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer#query-a-customer
            let startPosition = 1;
            const maxResults = 100;
            let latestUpdatedTime = '';

            while (true) {
                const filter = checkpoint?.updated_after ? ` WHERE MetaData.LastUpdatedTime > '${checkpoint.updated_after}'` : '';
                const query = `SELECT * FROM Customer${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

                // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer#query-a-customer
                const response = await nango.get({
                    endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                    params: { query },
                    retries: 10
                });

                const parsed = QueryResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse query response: ${parsed.error.message}`);
                }

                const results = parsed.data.QueryResponse.Customer ?? [];
                if (results.length === 0) {
                    break;
                }

                const active = results.filter((r) => r.Active !== false);
                const inactive = results.filter((r) => r.Active === false);

                if (active.length > 0) {
                    await nango.batchSave(active.map(toCustomer), 'Customer');
                }
                if (checkpoint?.updated_after && inactive.length > 0) {
                    await nango.batchDelete(
                        inactive.map((r) => ({ id: r.Id })),
                        'Customer'
                    );
                }

                const pageLatest = results.reduce((max: string, r) => {
                    const time = r.MetaData?.LastUpdatedTime;
                    return time && time > max ? time : max;
                }, '');
                if (pageLatest > latestUpdatedTime) {
                    latestUpdatedTime = pageLatest;
                }
                await nango.saveCheckpoint({ updated_after: latestUpdatedTime });

                if (results.length < maxResults) {
                    break;
                }
                startPosition += maxResults;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync.exec>[0];
export default sync;
