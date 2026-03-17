import { createSync } from 'nango';
import { z } from 'zod';

const DealSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    amount: z.number().optional(),
    closeDate: z.string().optional(),
    stage: z.string().optional(),
    ownerId: z.string().optional(),
    description: z.string().optional(),
    companyIds: z.array(z.string()),
    contactIds: z.array(z.string()),
    updatedAt: z.string()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

const HubspotDealApiSchema = z.object({
    id: z.string(),
    properties: z
        .object({
            dealname: z.string().nullish(),
            amount: z.string().nullish(),
            closedate: z.string().nullish(),
            dealstage: z.string().nullish(),
            hubspot_owner_id: z.string().nullish(),
            description: z.string().nullish(),
            hs_lastmodifieddate: z.string().nullish()
        })
        .nullish(),
    updatedAt: z.string().nullish()
});

const AssociationResponseSchema = z.object({
    results: z.array(z.object({ id: z.string() })).optional()
});

const DealSearchResponseSchema = z.object({
    results: z.array(HubspotDealApiSchema).optional(),
    paging: z
        .object({
            next: z
                .object({
                    after: z.string()
                })
                .optional()
        })
        .optional()
});

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
}

const sync = createSync({
    description: 'Sync deals with amount, close date, stage, owner, description, and associated companies and contacts',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/sync-deals', group: 'Deals' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Deal: DealSchema
    },

    exec: async (nango) => {
        const checkpoint = parseOptional(CheckpointSchema, await nango.getCheckpoint());

        const searchBody: Record<string, unknown> = {
            limit: 100,
            properties: ['dealname', 'amount', 'closedate', 'dealstage', 'hubspot_owner_id', 'description', 'hs_lastmodifieddate'],
            sorts: [
                {
                    propertyName: 'hs_lastmodifieddate',
                    direction: 'ASCENDING'
                }
            ]
        };

        if (checkpoint?.updatedAfter) {
            searchBody['filterGroups'] = [
                {
                    filters: [
                        {
                            propertyName: 'hs_lastmodifieddate',
                            operator: 'GT',
                            value: checkpoint.updatedAfter
                        }
                    ]
                }
            ];
        }

        let after: string | undefined;

        do {
            if (after) {
                searchBody['after'] = after;
            } else {
                delete searchBody['after'];
            }

            // https://developers.hubspot.com/docs/api-reference/search/guide#paging-through-results
            const response = await nango.post({
                endpoint: '/crm/v3/objects/deals/search',
                data: searchBody,
                retries: 3
            });

            const data = DealSearchResponseSchema.parse(response.data);
            const deals: z.infer<typeof DealSchema>[] = [];
            const parsedBatch = data.results || [];

            if (parsedBatch.length === 0) {
                break;
            }

            for (const deal of parsedBatch) {
                const dealId = deal.id;

                // Fetch associated companies
                // https://developers.hubspot.com/docs/reference/api/crm/associations/associations
                let companyIds: string[] = [];
                // @allowTryCatch Associations can be absent for a deal; treat that as an empty list.
                try {
                    const companiesResponse = await nango.get({
                        endpoint: `/crm/v3/objects/deals/${dealId}/associations/companies`,
                        retries: 3
                    });
                    companyIds = (AssociationResponseSchema.parse(companiesResponse.data).results || []).map((assoc) => assoc.id);
                } catch (Error) {
                    // Associations may not exist, continue without them
                }

                // Fetch associated contacts
                let contactIds: string[] = [];
                // @allowTryCatch Associations can be absent for a deal; treat that as an empty list.
                try {
                    const contactsResponse = await nango.get({
                        endpoint: `/crm/v3/objects/deals/${dealId}/associations/contacts`,
                        retries: 3
                    });
                    contactIds = (AssociationResponseSchema.parse(contactsResponse.data).results || []).map((assoc) => assoc.id);
                } catch (Error) {
                    // Associations may not exist, continue without them
                }

                const record: z.infer<typeof DealSchema> = {
                    id: dealId,
                    name: deal.properties?.['dealname'] ?? undefined,
                    amount: deal.properties?.['amount'] ? parseFloat(deal.properties['amount']) : undefined,
                    closeDate: deal.properties?.['closedate'] ?? undefined,
                    stage: deal.properties?.['dealstage'] ?? undefined,
                    ownerId: deal.properties?.['hubspot_owner_id'] ?? undefined,
                    description: deal.properties?.['description'] ?? undefined,
                    companyIds: companyIds,
                    contactIds: contactIds,
                    updatedAt: deal.properties?.['hs_lastmodifieddate'] ?? deal.updatedAt ?? new Date().toISOString()
                };

                deals.push(record);
            }

            if (deals.length > 0) {
                await nango.batchSave(deals, 'Deal');

                // Save checkpoint using the last deal's updated_at
                const lastDeal = deals[deals.length - 1];
                if (lastDeal) {
                    await nango.saveCheckpoint({
                        updatedAfter: lastDeal.updatedAt
                    });
                }
            }

            after = data.paging?.next?.after;
        } while (after);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
