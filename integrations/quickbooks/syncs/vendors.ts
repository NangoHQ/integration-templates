import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Provider API docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/vendor

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const VendorSchema = z.object({
    Id: z.string(),
    Active: z.boolean().optional(),
    DisplayName: z.string().optional(),
    GivenName: z.string().optional(),
    FamilyName: z.string().optional(),
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
    CompanyName: z.string().optional(),
    BillAddr: z
        .object({
            Line1: z.string().optional(),
            City: z.string().optional(),
            CountrySubDivisionCode: z.string().optional(),
            PostalCode: z.string().optional()
        })
        .optional(),
    MetaData: MetaDataSchema.optional()
});

const QueryResponseSchema = z.object({
    QueryResponse: z
        .object({
            Vendor: z.array(VendorSchema).optional()
        })
        .optional()
});

// CDCResponse schema is implicit in the paginate response path
// and handled by Nango's built-in pagination parsing

const VendorModelSchema = z.object({
    id: z.string(),
    active: z.boolean().optional(),
    displayName: z.string().optional(),
    givenName: z.string().optional(),
    familyName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    companyName: z.string().optional(),
    addressLine1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    lastUpdatedTime: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

function toVendorModel(vendor: z.infer<typeof VendorSchema>): z.infer<typeof VendorModelSchema> {
    return {
        id: vendor.Id,
        ...(vendor.Active !== undefined && { active: vendor.Active }),
        ...(vendor.DisplayName !== undefined && { displayName: vendor.DisplayName }),
        ...(vendor.GivenName !== undefined && { givenName: vendor.GivenName }),
        ...(vendor.FamilyName !== undefined && { familyName: vendor.FamilyName }),
        ...(vendor.PrimaryEmailAddr?.Address !== undefined && { email: vendor.PrimaryEmailAddr.Address }),
        ...(vendor.PrimaryPhone?.FreeFormNumber !== undefined && { phone: vendor.PrimaryPhone.FreeFormNumber }),
        ...(vendor.CompanyName !== undefined && { companyName: vendor.CompanyName }),
        ...(vendor.BillAddr?.Line1 !== undefined && { addressLine1: vendor.BillAddr.Line1 }),
        ...(vendor.BillAddr?.City !== undefined && { city: vendor.BillAddr.City }),
        ...(vendor.BillAddr?.CountrySubDivisionCode !== undefined && { state: vendor.BillAddr.CountrySubDivisionCode }),
        ...(vendor.BillAddr?.PostalCode !== undefined && { postalCode: vendor.BillAddr.PostalCode }),
        ...(vendor.MetaData?.LastUpdatedTime !== undefined && { lastUpdatedTime: vendor.MetaData.LastUpdatedTime })
    };
}

async function getRealmId(nango: { getConnection: () => Promise<{ connection_config?: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

const sync = createSync({
    description: 'Sync vendor records from QuickBooks Online',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Vendor: VendorModelSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/vendors'
        }
    ],

    exec: async (nango) => {
        const realmId = await getRealmId(nango);
        const checkpointResult = await nango.getCheckpoint();

        const checkpointParsed = CheckpointSchema.safeParse(checkpointResult);
        const checkpoint = checkpointParsed.success ? checkpointParsed.data : undefined;

        const MAX_LOOKBACK_DAYS = 29;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_LOOKBACK_DAYS);

        const useIncremental = checkpoint !== undefined && checkpoint.updated_after.length > 0 && new Date(checkpoint.updated_after) > cutoff;

        if (useIncremental) {
            // CDC path for incremental sync
            const proxyConfig: ProxyConfiguration = {
                // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/vendor#change-data-capture
                endpoint: `/v3/company/${encodeURIComponent(realmId)}/cdc`,
                params: { entities: 'Vendor', changedSince: checkpoint.updated_after },
                headers: { 'Content-Type': 'text/plain' },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'startPosition',
                    response_path: 'CDCResponse[0].QueryResponse[0].Vendor',
                    limit_name_in_request: 'maxResults',
                    limit: 1000
                },
                retries: 3
            };

            for await (const records of nango.paginate(proxyConfig)) {
                const parsed = z.array(VendorSchema).safeParse(records);
                if (!parsed.success) {
                    throw new Error(`Failed to parse CDC response: ${parsed.error.message}`);
                }
                const vendors = parsed.data;

                const active = vendors.filter((v) => v.Active !== false);
                const inactive = vendors.filter((v) => v.Active === false);

                if (active.length > 0) {
                    await nango.batchSave(active.map(toVendorModel), 'Vendor');
                }
                if (inactive.length > 0) {
                    await nango.batchDelete(
                        inactive.map((v) => ({ id: v.Id })),
                        'Vendor'
                    );
                }

                const latest = vendors.reduce((max, v) => {
                    const time = v.MetaData?.LastUpdatedTime;
                    return time !== undefined && time > max ? time : max;
                }, '');
                if (latest.length > 0) {
                    await nango.saveCheckpoint({ updated_after: latest });
                }
            }
        } else {
            // Full query path
            let startPosition = 1;
            const maxResults = 100;
            let latestUpdatedTime = '';

            while (true) {
                // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/vendor#query-a-vendor
                const filter =
                    checkpoint !== undefined && checkpoint.updated_after.length > 0 ? ` WHERE MetaData.LastUpdatedTime > '${checkpoint.updated_after}'` : '';
                const query = `SELECT * FROM Vendor${filter} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

                const response = await nango.get({
                    endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
                    params: { query },
                    retries: 10
                });

                const parsedResponse = QueryResponseSchema.safeParse(response.data);
                if (!parsedResponse.success) {
                    throw new Error(`Failed to parse query response: ${parsedResponse.error.message}`);
                }

                const results = parsedResponse.data.QueryResponse?.Vendor ?? [];
                if (results.length === 0) {
                    break;
                }

                const active = results.filter((v) => v.Active !== false);
                const inactive = results.filter((v) => v.Active === false);

                if (active.length > 0) {
                    await nango.batchSave(active.map(toVendorModel), 'Vendor');
                }
                if (checkpoint !== undefined && checkpoint.updated_after.length > 0 && inactive.length > 0) {
                    await nango.batchDelete(
                        inactive.map((v) => ({ id: v.Id })),
                        'Vendor'
                    );
                }

                const pageLatest = results.reduce((max, v) => {
                    const time = v.MetaData?.LastUpdatedTime;
                    return time !== undefined && time > max ? time : max;
                }, '');
                if (pageLatest.length > 0 && pageLatest > latestUpdatedTime) {
                    latestUpdatedTime = pageLatest;
                }

                if (latestUpdatedTime) {
                    await nango.saveCheckpoint({ updated_after: latestUpdatedTime });
                }

                if (results.length < maxResults) {
                    break;
                }
                startPosition += maxResults;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
