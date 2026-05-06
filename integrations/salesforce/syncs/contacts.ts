import { createSync } from 'nango';
import { z } from 'zod';

const SalesforceContactSchema = z.object({
    Id: z.string(),
    FirstName: z.string().nullable(),
    LastName: z.string(),
    Email: z.string().nullable(),
    Phone: z.string().nullable(),
    MobilePhone: z.string().nullable(),
    Title: z.string().nullable(),
    Department: z.string().nullable(),
    AccountId: z.string().nullable(),
    MailingStreet: z.string().nullable(),
    MailingCity: z.string().nullable(),
    MailingState: z.string().nullable(),
    MailingPostalCode: z.string().nullable(),
    MailingCountry: z.string().nullable(),
    CreatedDate: z.string(),
    SystemModstamp: z.string()
});

const ContactAddressSchema = z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional()
});

const ContactSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile_phone: z.string().optional(),
    title: z.string().optional(),
    department: z.string().optional(),
    account_id: z.string().optional(),
    mailing_address: ContactAddressSchema.optional(),
    created_at: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const SalesforceQueryResponseSchema = z.object({
    records: z.array(SalesforceContactSchema),
    done: z.boolean(),
    nextRecordsUrl: z.string().optional(),
    totalSize: z.number().int().optional()
});

type SalesforceContact = z.infer<typeof SalesforceContactSchema>;
type CheckpointModel = typeof CheckpointSchema;

const ModelsMap = {
    Contact: ContactSchema
};

const sync = createSync<typeof ModelsMap, undefined, CheckpointModel>({
    description: 'Sync Salesforce Contact records with a practical default field set',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/contacts' }],
    checkpoint: CheckpointSchema,
    models: ModelsMap,

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        const fields = [
            'Id',
            'FirstName',
            'LastName',
            'Email',
            'Phone',
            'MobilePhone',
            'Title',
            'Department',
            'AccountId',
            'MailingStreet',
            'MailingCity',
            'MailingState',
            'MailingPostalCode',
            'MailingCountry',
            'CreatedDate',
            'SystemModstamp'
        ];

        const whereClause = updatedAfter ? `WHERE SystemModstamp >= ${updatedAfter}` : '';
        const soql = `SELECT ${fields.join(', ')} FROM Contact ${whereClause} ORDER BY SystemModstamp ASC`;

        // Salesforce SOQL pagination uses nextRecordsUrl, not standard offset pagination
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
        let nextRecordsUrl: string | undefined;
        let hasMore = true;

        while (hasMore) {
            let response;

            if (nextRecordsUrl) {
                // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                response = await nango.get({
                    endpoint: nextRecordsUrl,
                    retries: 3
                });
            } else {
                // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                response = await nango.get({
                    endpoint: '/services/data/v59.0/query',
                    params: {
                        q: soql
                    },
                    retries: 3
                });
            }

            const parsedResponse = SalesforceQueryResponseSchema.safeParse(response.data);

            if (!parsedResponse.success) {
                throw new Error(`Failed to parse Salesforce query response: ${parsedResponse.error.message}`);
            }

            const { records, done, nextRecordsUrl: nextUrl } = parsedResponse.data;

            if (records.length === 0) {
                hasMore = !done && nextUrl !== undefined;
                nextRecordsUrl = nextUrl;
                continue;
            }

            const contacts = records.map((record: SalesforceContact) => ({
                id: record.Id,
                ...(record.FirstName !== null && { first_name: record.FirstName }),
                last_name: record.LastName,
                ...(record.Email !== null && { email: record.Email }),
                ...(record.Phone !== null && { phone: record.Phone }),
                ...(record.MobilePhone !== null && { mobile_phone: record.MobilePhone }),
                ...(record.Title !== null && { title: record.Title }),
                ...(record.Department !== null && { department: record.Department }),
                ...(record.AccountId !== null && { account_id: record.AccountId }),
                ...(record.MailingStreet !== null ||
                record.MailingCity !== null ||
                record.MailingState !== null ||
                record.MailingPostalCode !== null ||
                record.MailingCountry !== null
                    ? {
                          mailing_address: {
                              ...(record.MailingStreet !== null && { street: record.MailingStreet }),
                              ...(record.MailingCity !== null && { city: record.MailingCity }),
                              ...(record.MailingState !== null && { state: record.MailingState }),
                              ...(record.MailingPostalCode !== null && { postalCode: record.MailingPostalCode }),
                              ...(record.MailingCountry !== null && { country: record.MailingCountry })
                          }
                      }
                    : {}),
                created_at: record.CreatedDate
            }));

            await nango.batchSave(contacts, 'Contact');

            const lastRecord = records[records.length - 1];
            if (lastRecord) {
                await nango.saveCheckpoint({
                    updated_after: lastRecord.SystemModstamp
                });
            }

            hasMore = !done && nextUrl !== undefined;
            nextRecordsUrl = nextUrl;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
