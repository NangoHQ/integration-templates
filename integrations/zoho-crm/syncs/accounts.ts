import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ZohoAccountSchema = z.object({
    id: z.string(),
    Account_Name: z.string().nullable().optional(),
    Account_Number: z.string().nullable().optional(),
    Account_Type: z.string().nullable().optional(),
    Annual_Revenue: z.number().nullable().optional(),
    Billing_City: z.string().nullable().optional(),
    Billing_Code: z.string().nullable().optional(),
    Billing_Country: z.string().nullable().optional(),
    Billing_State: z.string().nullable().optional(),
    Billing_Street: z.string().nullable().optional(),
    Created_By: z
        .object({
            name: z.string().optional(),
            id: z.string().optional(),
            email: z.string().optional()
        })
        .nullable()
        .optional(),
    Created_Time: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Employees: z.number().nullable().optional(),
    Fax: z.string().nullable().optional(),
    Industry: z.string().nullable().optional(),
    Modified_By: z
        .object({
            name: z.string().optional(),
            id: z.string().optional(),
            email: z.string().optional()
        })
        .nullable()
        .optional(),
    Modified_Time: z.string(),
    Owner: z
        .object({
            name: z.string().optional(),
            id: z.string().optional(),
            email: z.string().optional()
        })
        .nullable()
        .optional(),
    Ownership: z.string().nullable().optional(),
    Parent_Account: z
        .object({
            name: z.string().optional(),
            id: z.string().optional()
        })
        .nullable()
        .optional(),
    Phone: z.string().nullable().optional(),
    Rating: z.string().nullable().optional(),
    Shipping_City: z.string().nullable().optional(),
    Shipping_Code: z.string().nullable().optional(),
    Shipping_Country: z.string().nullable().optional(),
    Shipping_State: z.string().nullable().optional(),
    Shipping_Street: z.string().nullable().optional(),
    SIC_Code: z.string().nullable().optional(),
    Ticker_Symbol: z.string().nullable().optional(),
    Website: z.string().nullable().optional()
});

const ZohoResponseInfoSchema = z.object({
    per_page: z.number().optional(),
    count: z.number(),
    page: z.number().optional(),
    more_records: z.boolean(),
    next_page_token: z.string().nullable().optional()
});

const ZohoAccountsResponseSchema = z.object({
    data: z.array(ZohoAccountSchema),
    info: ZohoResponseInfoSchema
});

const ZohoDeletedRecordSchema = z.object({
    id: z.string()
});

const AccountSchema = z.object({
    id: z.string(),
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    accountType: z.string().optional(),
    annualRevenue: z.number().optional(),
    billingCity: z.string().optional(),
    billingCode: z.string().optional(),
    billingCountry: z.string().optional(),
    billingState: z.string().optional(),
    billingStreet: z.string().optional(),
    createdByName: z.string().optional(),
    createdById: z.string().optional(),
    createdByEmail: z.string().optional(),
    createdTime: z.string().optional(),
    description: z.string().optional(),
    employees: z.number().optional(),
    fax: z.string().optional(),
    industry: z.string().optional(),
    modifiedByName: z.string().optional(),
    modifiedById: z.string().optional(),
    modifiedByEmail: z.string().optional(),
    modifiedTime: z.string(),
    ownerName: z.string().optional(),
    ownerId: z.string().optional(),
    ownerEmail: z.string().optional(),
    ownership: z.string().optional(),
    parentAccountName: z.string().optional(),
    parentAccountId: z.string().optional(),
    phone: z.string().optional(),
    rating: z.string().optional(),
    shippingCity: z.string().optional(),
    shippingCode: z.string().optional(),
    shippingCountry: z.string().optional(),
    shippingState: z.string().optional(),
    shippingStreet: z.string().optional(),
    sicCode: z.string().optional(),
    tickerSymbol: z.string().optional(),
    website: z.string().optional()
});

const CheckpointSchema = z.object({
    modifiedAfter: z.string(),
    page: z.number().int().positive()
});

function mapZohoAccountToAccount(record: z.infer<typeof ZohoAccountSchema>): z.infer<typeof AccountSchema> {
    return {
        id: record.id,
        accountName: record.Account_Name ?? undefined,
        accountNumber: record.Account_Number ?? undefined,
        accountType: record.Account_Type ?? undefined,
        annualRevenue: record.Annual_Revenue ?? undefined,
        billingCity: record.Billing_City ?? undefined,
        billingCode: record.Billing_Code ?? undefined,
        billingCountry: record.Billing_Country ?? undefined,
        billingState: record.Billing_State ?? undefined,
        billingStreet: record.Billing_Street ?? undefined,
        createdByName: record.Created_By?.name,
        createdById: record.Created_By?.id,
        createdByEmail: record.Created_By?.email,
        createdTime: record.Created_Time ?? undefined,
        description: record.Description ?? undefined,
        employees: record.Employees ?? undefined,
        fax: record.Fax ?? undefined,
        industry: record.Industry ?? undefined,
        modifiedByName: record.Modified_By?.name,
        modifiedById: record.Modified_By?.id,
        modifiedByEmail: record.Modified_By?.email,
        modifiedTime: record.Modified_Time,
        ownerName: record.Owner?.name,
        ownerId: record.Owner?.id,
        ownerEmail: record.Owner?.email,
        ownership: record.Ownership ?? undefined,
        parentAccountName: record.Parent_Account?.name,
        parentAccountId: record.Parent_Account?.id,
        phone: record.Phone ?? undefined,
        rating: record.Rating ?? undefined,
        shippingCity: record.Shipping_City ?? undefined,
        shippingCode: record.Shipping_Code ?? undefined,
        shippingCountry: record.Shipping_Country ?? undefined,
        shippingState: record.Shipping_State ?? undefined,
        shippingStreet: record.Shipping_Street ?? undefined,
        sicCode: record.SIC_Code ?? undefined,
        tickerSymbol: record.Ticker_Symbol ?? undefined,
        website: record.Website ?? undefined
    };
}

const sync = createSync({
    description: 'Sync accounts from Zoho CRM',
    version: '2.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/accounts' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Account: AccountSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let modifiedAfter: string | undefined = checkpoint?.modifiedAfter || undefined;
        const previousModifiedAfter = modifiedAfter;
        let page = checkpoint?.page ?? 1;

        while (true) {
            const params: Record<string, string | number> = {
                page,
                per_page: 200,
                sort_by: 'Modified_Time',
                sort_order: 'asc'
            };

            // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
            const response = await nango.get({
                endpoint: '/crm/v2/Accounts',
                ...(modifiedAfter
                    ? {
                          headers: {
                              'If-Modified-Since': modifiedAfter
                          }
                      }
                    : {}),
                params,
                retries: 3
            });

            const parsedResponse = ZohoAccountsResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Invalid response from Zoho CRM: ${parsedResponse.error.message}`);
            }

            const { data: accounts, info } = parsedResponse.data;
            const lastAccount = accounts[accounts.length - 1];

            if (accounts.length === 0) {
                await nango.saveCheckpoint({
                    modifiedAfter: modifiedAfter ?? '',
                    page: 1
                });
                break;
            }

            await nango.batchSave(accounts.map(mapZohoAccountToAccount), 'Account');

            if (info.more_records) {
                page += 1;
                await nango.saveCheckpoint({
                    modifiedAfter: modifiedAfter ?? '',
                    page
                });
                continue;
            }

            if (lastAccount) {
                modifiedAfter = lastAccount.Modified_Time;
            }

            await nango.saveCheckpoint({
                modifiedAfter: modifiedAfter ?? '',
                page: 1
            });
            break;
        }

        if (previousModifiedAfter) {
            const deletedAccounts: Array<{ id: string }> = [];
            const deletedProxyConfig: ProxyConfiguration = {
                // https://www.zoho.com/crm/developer/docs/api/v2/get-deleted-records.html
                endpoint: '/crm/v2/Accounts/deleted',
                headers: {
                    'If-Modified-Since': previousModifiedAfter
                },
                params: {
                    type: 'all'
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 200,
                    response_path: 'data'
                },
                retries: 3
            };

            for await (const pageResults of nango.paginate<z.infer<typeof ZohoDeletedRecordSchema>>(deletedProxyConfig)) {
                for (const rawRecord of pageResults) {
                    const parsedRecord = ZohoDeletedRecordSchema.safeParse(rawRecord);
                    if (parsedRecord.success) {
                        deletedAccounts.push({ id: parsedRecord.data.id });
                    }
                }
            }

            if (deletedAccounts.length > 0) {
                await nango.batchDelete(deletedAccounts, 'Account');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
