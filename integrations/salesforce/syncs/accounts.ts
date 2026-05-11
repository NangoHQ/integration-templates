import { createSync } from 'nango';
import { z } from 'zod';

const AccountSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    accountNumber: z.string().optional(),
    industry: z.string().optional(),
    type: z.string().optional(),
    billingCity: z.string().optional(),
    billingState: z.string().optional(),
    billingCountry: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    createdDate: z.string(),
    lastModifiedDate: z.string(),
    systemModstamp: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

type CheckpointType = {
    updated_after?: string;
};

// Salesforce SOQL query response
const SalesforceRecordSchema = z.object({
    Id: z.string(),
    Name: z.string().nullable().optional(),
    AccountNumber: z.string().nullable().optional(),
    Industry: z.string().nullable().optional(),
    Type: z.string().nullable().optional(),
    BillingCity: z.string().nullable().optional(),
    BillingState: z.string().nullable().optional(),
    BillingCountry: z.string().nullable().optional(),
    Phone: z.string().nullable().optional(),
    Website: z.string().nullable().optional(),
    CreatedDate: z.string(),
    LastModifiedDate: z.string(),
    SystemModstamp: z.string()
});

const SalesforceQueryResponseSchema = z.object({
    records: z.array(SalesforceRecordSchema),
    nextRecordsUrl: z.string().optional()
});

type SalesforceRecord = z.infer<typeof SalesforceRecordSchema>;

const sync = createSync({
    description: 'Sync Salesforce Account records with a practical default field set',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ path: '/syncs/accounts', method: 'POST' }],
    checkpoint: CheckpointSchema,
    models: {
        Account: AccountSchema
    },

    exec: async (nango) => {
        const checkpoint: CheckpointType | null = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        // Build SOQL query with incremental filter
        const fields =
            'Id, Name, AccountNumber, Industry, Type, BillingCity, BillingState, BillingCountry, Phone, Website, CreatedDate, LastModifiedDate, SystemModstamp';
        let query = `SELECT ${fields} FROM Account`;
        if (updatedAfter) {
            query += ` WHERE SystemModstamp >= ${updatedAfter}`;
        }
        query += ' ORDER BY SystemModstamp ASC';

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
        const config = {
            endpoint: '/services/data/v59.0/query',
            params: {
                q: query
            },
            retries: 3
        };

        let hasMorePages = true;
        let nextRecordsUrl: string | undefined;

        while (hasMorePages) {
            // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
            const response = await nango.get({
                ...config,
                ...(nextRecordsUrl ? { endpoint: nextRecordsUrl } : {}),
                retries: 10
            });

            const parsed = SalesforceQueryResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse Salesforce response: ${parsed.error.message}`);
            }

            const data = parsed.data;

            const accounts = data.records.map((record: SalesforceRecord) => ({
                id: record.Id,
                ...(record.Name != null && { name: record.Name }),
                ...(record.AccountNumber != null && { accountNumber: record.AccountNumber }),
                ...(record.Industry != null && { industry: record.Industry }),
                ...(record.Type != null && { type: record.Type }),
                ...(record.BillingCity != null && { billingCity: record.BillingCity }),
                ...(record.BillingState != null && { billingState: record.BillingState }),
                ...(record.BillingCountry != null && { billingCountry: record.BillingCountry }),
                ...(record.Phone != null && { phone: record.Phone }),
                ...(record.Website != null && { website: record.Website }),
                createdDate: record.CreatedDate,
                lastModifiedDate: record.LastModifiedDate,
                systemModstamp: record.SystemModstamp
            }));

            if (accounts.length > 0) {
                await nango.batchSave(accounts, 'Account');
                const lastAccount = accounts[accounts.length - 1];
                if (lastAccount) {
                    await nango.saveCheckpoint({
                        updated_after: lastAccount.systemModstamp
                    });
                }
            }

            nextRecordsUrl = data.nextRecordsUrl;
            hasMorePages = Boolean(nextRecordsUrl);

            // Update config for next iteration if using nextRecordsUrl
            if (nextRecordsUrl) {
                // nextRecordsUrl is a relative URL path
                config.endpoint = nextRecordsUrl;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
