import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Provider schema - matches Zoho CRM API response structure exactly
const ZohoOwnerSchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string().optional()
});

const ZohoAccountNameSchema = z.object({
    name: z.string(),
    id: z.string()
});

const ZohoContactNameSchema = z.object({
    name: z.string(),
    id: z.string()
});

const _ZohoDealSchema = z.object({
    id: z.string(),
    Deal_Name: z.string().optional(),
    Stage: z.string().optional(),
    Amount: z.number().optional().nullable(),
    Closing_Date: z.string().optional().nullable(),
    Account_Name: ZohoAccountNameSchema.optional().nullable(),
    Contact_Name: ZohoContactNameSchema.optional().nullable(),
    Owner: ZohoOwnerSchema.optional(),
    Created_Time: z.string(),
    Modified_Time: z.string(),
    Probability: z.union([z.string(), z.number()]).optional().nullable(),
    Expected_Revenue: z.number().optional().nullable(),
    Description: z.string().optional().nullable(),
    Campaign_Source: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional()
        .nullable(),
    Lead_Source: z.string().optional().nullable(),
    Type: z.string().optional().nullable(),
    Next_Step: z.string().optional().nullable()
});

// Normalized model schema for Nango
const DealSchema = z.object({
    id: z.string(),
    dealName: z.string().optional(),
    stage: z.string().optional(),
    amount: z.number().optional(),
    closingDate: z.string().optional(),
    accountName: z.string().optional(),
    accountId: z.string().optional(),
    contactName: z.string().optional(),
    contactId: z.string().optional(),
    ownerName: z.string().optional(),
    ownerId: z.string().optional(),
    ownerEmail: z.string().optional(),
    createdTime: z.string(),
    modifiedTime: z.string(),
    probability: z.union([z.string(), z.number()]).optional(),
    expectedRevenue: z.number().optional(),
    description: z.string().optional(),
    campaignSource: z.string().optional(),
    leadSource: z.string().optional(),
    type: z.string().optional(),
    nextStep: z.string().optional()
});

// Checkpoint schema - ZodCheckpoint only allows string/number/boolean values
const CheckpointSchema = z.object({
    modifiedAfter: z.string()
});

type ZohoDeal = z.infer<typeof _ZohoDealSchema>;
type Deal = z.infer<typeof DealSchema>;
type Checkpoint = z.infer<typeof CheckpointSchema>;

const modelSchemas = {
    Deal: DealSchema
};

const DeletedDealSchema = z.object({
    id: z.string()
});

const sync = createSync<typeof modelSchemas, undefined, typeof CheckpointSchema>({
    description: 'Sync deals from Zoho CRM',
    version: '2.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/deals'
        }
    ],
    checkpoint: CheckpointSchema,
    models: modelSchemas,

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const previousModifiedAfter = checkpoint?.modifiedAfter;

        let page = 1;
        let lastModifiedTime: string | undefined;
        const perPage = 200;

        // Build headers only if we have a checkpoint
        const headers: Record<string, string> | undefined = checkpoint?.modifiedAfter ? { 'If-Modified-Since': checkpoint.modifiedAfter } : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
            endpoint: '/crm/v2/Deals',
            params: {
                sort_by: 'Modified_Time',
                sort_order: 'asc',
                page: page,
                per_page: perPage
            },
            ...(headers && { headers }),
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: perPage,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'number') {
                        page = nextPageParam;
                    } else if (typeof nextPageParam === 'string') {
                        page = parseInt(nextPageParam, 10) || page + 1;
                    } else {
                        page = page + 1;
                    }
                }
            },
            retries: 3
        };

        for await (const batch of nango.paginate<ZohoDeal>(proxyConfig)) {
            if (batch.length === 0) {
                continue;
            }

            const deals: Deal[] = batch.map((deal) => {
                const result: Deal = {
                    id: deal.id,
                    createdTime: deal.Created_Time,
                    modifiedTime: deal.Modified_Time
                };

                if (deal.Deal_Name) {
                    result.dealName = deal.Deal_Name;
                }
                if (deal.Stage) {
                    result.stage = deal.Stage;
                }
                if (deal.Amount != null) {
                    result.amount = deal.Amount;
                }
                if (deal.Closing_Date) {
                    result.closingDate = deal.Closing_Date;
                }
                if (deal.Account_Name) {
                    result.accountName = deal.Account_Name.name;
                    result.accountId = deal.Account_Name.id;
                }
                if (deal.Contact_Name) {
                    result.contactName = deal.Contact_Name.name;
                    result.contactId = deal.Contact_Name.id;
                }
                if (deal.Owner) {
                    result.ownerName = deal.Owner.name;
                    result.ownerId = deal.Owner.id;
                    if (deal.Owner.email) {
                        result.ownerEmail = deal.Owner.email;
                    }
                }
                if (deal.Probability != null) {
                    result.probability = deal.Probability;
                }
                if (deal.Expected_Revenue != null) {
                    result.expectedRevenue = deal.Expected_Revenue;
                }
                if (deal.Description) {
                    result.description = deal.Description;
                }
                if (deal.Campaign_Source) {
                    result.campaignSource = deal.Campaign_Source.name;
                }
                if (deal.Lead_Source) {
                    result.leadSource = deal.Lead_Source;
                }
                if (deal.Type) {
                    result.type = deal.Type;
                }
                if (deal.Next_Step) {
                    result.nextStep = deal.Next_Step;
                }

                return result;
            });

            await nango.batchSave(deals, 'Deal');

            // Track the latest modified time for checkpoint
            for (const deal of batch) {
                if (deal.Modified_Time) {
                    if (lastModifiedTime === undefined || deal.Modified_Time > lastModifiedTime) {
                        lastModifiedTime = deal.Modified_Time;
                    }
                }
            }
        }

        if (previousModifiedAfter) {
            const deletedDeals: Array<{ id: string }> = [];
            const deletedProxyConfig: ProxyConfiguration = {
                // https://www.zoho.com/crm/developer/docs/api/v2/get-deleted-records.html
                endpoint: '/crm/v2/Deals/deleted',
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

            for await (const pageResults of nango.paginate<z.infer<typeof DeletedDealSchema>>(deletedProxyConfig)) {
                for (const rawRecord of pageResults) {
                    const parsedRecord = DeletedDealSchema.safeParse(rawRecord);
                    if (parsedRecord.success) {
                        deletedDeals.push({ id: parsedRecord.data.id });
                    }
                }
            }

            if (deletedDeals.length > 0) {
                await nango.batchDelete(deletedDeals, 'Deal');
            }
        }

        // Save checkpoint — use current time if no updated deals found (deletion-only runs)
        const newCheckpoint: Checkpoint = {
            modifiedAfter: lastModifiedTime ?? new Date().toISOString()
        };
        await nango.saveCheckpoint(newCheckpoint);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
